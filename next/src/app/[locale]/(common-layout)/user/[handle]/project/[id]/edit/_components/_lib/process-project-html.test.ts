import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import { jsonToHtml } from "@/app/[locale]/_lib/json-to-html";
import type { AstNode } from "@/app/types/ast-node";
import { prisma } from "@/lib/prisma";
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { upsertProjectAndSegments } from "../../_db/mutations.server";

/* ----------------- helper ----------------- */
const p = (text: string, hash: string): AstNode => ({
	type: "paragraph",
	content: [{ type: "text", text, attrs: { hash } }],
});

const img = (src: string): AstNode => ({
	type: "image",
	attrs: { src, alt: "" },
});

function h(text: string, occ = 0) {
	return generateHashForText(text, occ);
}

/* ----------------- spec ----------------- */
describe("upsertProjectAndSegments – JSON integration", () => {
	let userId: string;
	let projectId: string;
	const tagLine = "Tag Line";
	const doc: AstNode = {
		type: "doc",
		content: [
			p("This is a test.", h("This is a test.")),
			p("This is another test.", h("This is another test.")),
		],
	};
	beforeEach(async () => {
		await prisma.$transaction([
			prisma.projectSegment.deleteMany(),
			prisma.project.deleteMany(),
			prisma.user.deleteMany(),
		]);
		const u = await prisma.user.create({
			data: {
				handle: "tester",
				name: "Tester",
				email: "tester@example.com",
				image: "",
			},
		});
		userId = u.id;

		const project = await prisma.project.create({
			data: {
				userId,
				title: "Title",
				description: "test",
				sourceLocale: "en",
			},
		});
		projectId = project.id;
	});

	afterEach(() => prisma.$disconnect());

	afterAll(async () => {
		await prisma.$disconnect();
	});

	/* ----------------- 1. 基本挿入 ----------------- */
	test("store segments & hash from JSON input", async () => {
		await upsertProjectAndSegments({
			projectId,
			userId,
			title: "Title",
			tagLine,
			descriptionJson: doc,
			sourceLocale: "en",
		});

		const foundProject = await prisma.project.findUnique({
			where: { id: projectId },
			include: { projectSegments: true },
		});
		expect(foundProject).not.toBeNull();
		if (!foundProject) throw new Error("Project should exist");

		expect(foundProject?.projectSegments.length).toBe(3);
		const [s0, s1] = foundProject.projectSegments.sort(
			(a, b) => a.number - b.number,
		);
		expect(s0.number).toBe(0);
		expect(s1.number).toBe(100);
		for (const seg of foundProject?.projectSegments ?? []) {
			expect(seg.textAndOccurrenceHash).toBeTruthy();
		}
	});

	/* ----------------- 2. 編集後ハッシュ維持 ----------------- */
	test("unchanged sentences keep ids after re‑save", async () => {
		const tagLine = "Tag Line";
		const v1: AstNode = {
			type: "doc",
			content: [p("A", h("A")), p("B", h("B")), p("C", h("C"))],
		};

		await upsertProjectAndSegments({
			projectId,
			userId,
			title: "",
			tagLine,
			descriptionJson: v1,
			sourceLocale: "en",
		});

		const first = await prisma.project.findUnique({
			where: { id: projectId },
			include: { projectSegments: true },
		});
		if (!first) throw new Error("First project should exist");
		const idMap = new Map(first.projectSegments.map((s) => [s.text, s.id]));

		const v2: AstNode = {
			type: "doc",
			content: [
				p("A!", h("A!", 1)),
				p("B", h("B")),
				p("D", h("D")),
				p("C", h("C")),
			],
		};

		await upsertProjectAndSegments({
			projectId,
			userId,
			title: "",
			tagLine,
			descriptionJson: v2,
			sourceLocale: "en",
		});

		const second = await prisma.project.findUnique({
			where: { id: projectId },
			include: { projectSegments: true },
		});
		if (!second) throw new Error("Second project should exist");
		const map2 = new Map(second.projectSegments.map((s) => [s.text, s.id]));

		expect(map2.get("B")).toBe(idMap.get("B")); // unchanged
		expect(map2.get("C")).toBe(idMap.get("C")); // unchanged
		expect(map2.get("A!")).not.toBe(idMap.get("A")); // modified
		expect(map2.get("D")).toBeDefined(); // new
	});

	/* ----------------- 3. タグライン重複 ----------------- */
	test("tagline duplication handled via occurrence index", async () => {
		const title = "Dup";
		const tagLine = "Tag Line";
		const doc: AstNode = {
			type: "doc",
			content: [p(tagLine, h(tagLine, 1))],
		};

		await upsertProjectAndSegments({
			projectId,
			userId,
			title,
			tagLine,
			descriptionJson: doc,
			sourceLocale: "en",
		});

		const prj = await prisma.project.findUnique({
			where: { id: projectId },
			include: { projectSegments: true },
		});
		if (!prj) throw new Error("Project should exist");

		const dupSegs = prj.projectSegments.filter((s) => s.text === tagLine);
		expect(dupSegs.length).toBe(2); // occurrence 0 & 1
		for (const seg of dupSegs) {
			expect(seg.textAndOccurrenceHash).toBeTruthy();
		}
	});

	/* ----------------- 4. 再保存で ID 不変 ----------------- */
	test("no-op save keeps identical segment ids", async () => {
		const tagLine = "Tag Line";
		const doc: AstNode = {
			type: "doc",
			content: [p("X", h("X")), p("Y", h("Y"))],
		};

		await upsertProjectAndSegments({
			projectId,
			userId,
			title: "",
			tagLine,
			descriptionJson: doc,
			sourceLocale: "en",
		});
		const first = await prisma.project.findUnique({
			where: { id: projectId },
			include: { projectSegments: true },
		});
		if (!first) throw new Error("First project should exist");
		const ids = first.projectSegments.map((s) => s.id);

		await upsertProjectAndSegments({
			projectId,
			userId,
			title: "",
			tagLine,
			descriptionJson: doc,
			sourceLocale: "en",
		});
		const second = await prisma.project.findUnique({
			where: { id: projectId },
			include: { projectSegments: true },
		});
		if (!second) throw new Error("Second project should exist");

		expect(second.projectSegments.map((s) => s.id)).toEqual(ids);
	});

	/* ----------------- 5. 画像ノードが p でラップされない ----------------- */
	test("image node outputs standalone img tag", async () => {
		const tagLine = "Tag Line";
		const src = "http://localhost/sample.png";
		const doc: AstNode = {
			type: "doc",
			content: [
				p("before", h("before")),
				img(src), // p の外に配置
				p("after", h("after")),
			],
		};

		await upsertProjectAndSegments({
			projectId,
			userId,
			title: "",
			tagLine,
			descriptionJson: doc,
			sourceLocale: "en",
		});

		const prj = await prisma.project.findUnique({
			where: { id: projectId },
		});
		if (!prj) throw new Error("Project should exist");

		const html = jsonToHtml(prj.descriptionJson as AstNode);

		expect(html).toMatch(new RegExp(`<img [^>]*src="${src}"[^>]*>`)); // 画像は存在
		expect(html).not.toMatch(/<p><img[^>]*><\/p>/); // p でラップされていない
	});
});
