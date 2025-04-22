import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import { jsonToHtml } from "@/app/[locale]/_lib/json-to-html";
import type { AstNode } from "@/app/types/ast-node";
import { prisma } from "@/lib/prisma";
/* tests/process-json-content.test.ts */
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { upsertPageAndSegments } from "../_db/mutations.server";

const p = (text: string, hash: string): AstNode => ({
	type: "paragraph",
	content: [{ type: "text", text, attrs: { hash } }],
});

/* img ノード */
const img = (src: string): AstNode => ({
	type: "image",
	attrs: { src, alt: "" },
});

describe("upsertPageAndSegments", () => {
	let userId: string;

	beforeEach(async () => {
		await prisma.$transaction([
			prisma.page.deleteMany(),
			prisma.user.deleteMany(),
		]);
		const u = await prisma.user.create({
			data: {
				handle: "tester",
				name: "Tester",
				image: "x",
				email: "test@example.com",
			},
		});
		userId = u.id;
	});

	afterEach(() => prisma.$disconnect());

	function h(text: string, occ = 1) {
		return generateHashForText(text, occ);
	}

	/* ----------------- 1. 基本挿入 ----------------- */
	test("store segments & hash from JSON input", async () => {
		const slug = "json-basic";
		const content: AstNode = {
			type: "doc",
			content: [p("Line 1", h("Line 1")), p("Line 2", h("Line 2"))],
		};

		await upsertPageAndSegments({
			slug,
			userId,
			title: "Title",
			contentJson: content,
			sourceLocale: "en",
		});

		const page = await prisma.page.findUnique({
			where: { slug },
			include: { pageSegments: true },
		});
		expect(page).not.toBeNull();
		expect(page?.pageSegments.length).toBe(3);

		// Make sure page is not null before accessing its properties
		if (!page) throw new Error("Page should exist");

		const [titleSeg, l1, l2] = page.pageSegments.sort(
			(a, b) => a.number - b.number,
		);
		expect(titleSeg.number).toBe(0);
		expect(l1.textAndOccurrenceHash).toBe(h("Line 1"));
		expect(l2.textAndOccurrenceHash).toBe(h("Line 2"));
	});

	/* ----------------- 2. 編集後ハッシュ維持 ----------------- */
	test("unchanged sentences keep ids after re‑save", async () => {
		const slug = "json-edit";
		const v1: AstNode = {
			type: "doc",
			content: [p("A", h("A")), p("B", h("B")), p("C", h("C"))],
		};
		await upsertPageAndSegments({
			slug,
			userId,
			title: "",
			contentJson: v1,
			sourceLocale: "en",
		});

		const first = await prisma.page.findUnique({
			where: { slug },
			include: { pageSegments: true },
		});
		expect(first).not.toBeNull();
		if (!first) throw new Error("First page should exist");

		const idMap = new Map(first.pageSegments.map((s) => [s.text, s.id]));

		const v2: AstNode = {
			type: "doc",
			content: [
				p("A!", h("A!", 1)),
				p("B", h("B")),
				p("D", h("D")),
				p("C", h("C")),
			],
		};
		await upsertPageAndSegments({
			slug,
			userId,
			title: "",
			contentJson: v2,
			sourceLocale: "en",
		});

		const second = await prisma.page.findUnique({
			where: { slug },
			include: { pageSegments: true },
		});
		expect(second).not.toBeNull();
		if (!second) throw new Error("Second page should exist");

		const map2 = new Map(second.pageSegments.map((s) => [s.text, s.id]));

		expect(map2.get("B")).toBe(idMap.get("B")); // unchanged
		expect(map2.get("C")).toBe(idMap.get("C")); // unchanged
		expect(map2.get("A!")).not.toBe(idMap.get("A")); // modified text → new row
	});

	/* ----------------- 3. タイトル重複 ----------------- */
	test("title duplication handled via occurrence index", async () => {
		const slug = "json-dup";
		const title = "Dup";
		const content: AstNode = {
			type: "doc",
			content: [p(`${title}`, h(title, 1))],
		};
		await upsertPageAndSegments({
			slug,
			userId,
			title,
			contentJson: content,
			sourceLocale: "en",
		});

		const pg = await prisma.page.findUnique({
			where: { slug },
			include: { pageSegments: true },
		});
		expect(pg).not.toBeNull();
		if (!pg) throw new Error("Page should exist");

		const dupSegs = pg.pageSegments.filter((s) => s.text === title);
		expect(dupSegs.length).toBe(2); // occurrence=0 (title) & 1 (body)
		dupSegs.forEach((s, i) =>
			expect(s.textAndOccurrenceHash).toBe(h(title, i)),
		);
	});

	/* ----------------- 4. 再保存で ID 不変 ----------------- */
	test("no-op save keeps identical segment ids", async () => {
		const slug = "json-idempotent";
		const body: AstNode = {
			type: "doc",
			content: [p("X", h("X")), p("Y", h("Y"))],
		};
		await upsertPageAndSegments({
			slug,
			userId,
			title: "",
			contentJson: body,
			sourceLocale: "en",
		});
		const first = await prisma.page.findUnique({
			where: { slug },
			include: { pageSegments: true },
		});
		expect(first).not.toBeNull();
		if (!first) throw new Error("First page should exist");

		const ids = first.pageSegments.map((s) => s.id);

		await upsertPageAndSegments({
			slug,
			userId,
			title: "",
			contentJson: body,
			sourceLocale: "en",
		});
		const second = await prisma.page.findUnique({
			where: { slug },
			include: { pageSegments: true },
		});
		expect(second).not.toBeNull();
		if (!second) throw new Error("Second page should exist");

		expect(second.pageSegments.map((s) => s.id)).toEqual(ids);
	});

	/* ----------------- 5. 画像ノードが p でラップされない ----------------- */
	test("image node outputs standalone img tag", async () => {
		const slug = "json-img";
		const src = "http://localhost/img.png";
		const doc: AstNode = {
			type: "doc",
			content: [
				p("text", h("text")),
				img(src), // <img> ノードを p の外に置く
			],
		};

		await upsertPageAndSegments({
			slug,
			userId,
			title: "",
			contentJson: doc,
			sourceLocale: "en",
		});

		/* 1. DB に保存された JSON を取得 */
		const page = await prisma.page.findUnique({ where: { slug } });
		expect(page).not.toBeNull();
		if (!page) throw new Error("Page should exist");

		const html = jsonToHtml(page.contentJson as AstNode);

		/* 3. アサーション */
		expect(html).toMatch(new RegExp(`<img [^>]*src="${src}"[^>]*>`)); // 画像がある
		expect(html).not.toMatch(/<p><img[^>]*><\/p>/);
	});
});
