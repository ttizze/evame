import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { loadReaderData } from "./load-reader-data";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);
afterEach(() => vi.unstubAllGlobals());

it("AboutのHTMLを描画するときに、以前の件数キャッシュを使わず公開状態を集計する", async () => {
	vi.stubGlobal("caches", {
		open: async () => ({
			match: async () =>
				Response.json({ articles: 999, translations: 999, languages: 18 }),
			put: vi.fn(),
		}),
	});
	const user = await createUser();
	await createPageWithSegments({
		userId: user.id,
		slug: "evame-ja",
		segments: [{ number: 0, text: "About", textAndOccurrenceHash: "about" }],
	});
	const article = await createPageWithSegments({
		userId: user.id,
		slug: "article",
		segments: [{ number: 0, text: "記事", textAndOccurrenceHash: "article" }],
	});
	const before = await loadReaderData("/en/about", "", new Headers());
	expect(before?.kind).toBe("about");
	if (before?.kind !== "about") throw new Error("Aboutのデータがない");
	expect(before.data.stats.articles).toBe(2);
	await db
		.updateTable("pages")
		.set({ status: "DRAFT" })
		.where("id", "=", article.id)
		.execute();
	const after = await loadReaderData("/en/about", "", new Headers());
	if (after?.kind !== "about") throw new Error("Aboutのデータがない");
	expect(after.data.stats.articles).toBe(1);
});

it("空の新着・タグ一覧にもグループキーを付け記事の追加を反映できる", async () => {
	const newest = await loadReaderData("/ja/new-pages", "", new Headers());
	const tag = await loadReaderData("/ja/tag/空のタグ", "", new Headers());
	expect(newest?.cacheKeys).toEqual(["list:new"]);
	expect(tag?.cacheKeys).toEqual(["tag:空のタグ"]);
});

it("本文と掲載カードの依存キーを共有し一覧の無関係なページを残せる", async () => {
	const user = await createUser();
	const article = await createPageWithSegments({
		userId: user.id,
		mdastJson: { type: "root", children: [] },
		slug: "cache-article",
		segments: [{ number: 0, text: "記事", textAndOccurrenceHash: "article" }],
	});
	const detail = await loadReaderData(
		`/ja/${user.handle}/${article.slug}`,
		"",
		new Headers(),
	);
	const newest = await loadReaderData("/ja/new-pages", "", new Headers());
	expect(detail?.cacheKeys).toEqual(
		expect.arrayContaining([
			`page:${article.id}`,
			`author:${user.handle}`,
			`tree:${article.id}`,
		]),
	);
	expect(newest?.cacheKeys).toEqual(
		expect.arrayContaining([
			`page:${article.id}`,
			`author:${user.handle}`,
			"list:new",
		]),
	);
	expect(detail?.cacheKeys).not.toContain("list:new");
});

it("祖先と同じ階層の記事の著者ハンドルも依存として記録する", async () => {
	const grandparentUser = await createUser();
	const user = await createUser();
	const grandparent = await createPageWithSegments({
		userId: grandparentUser.id,
		mdastJson: { type: "root", children: [] },
		slug: "grandparent",
		segments: [
			{ number: 0, text: "祖父", textAndOccurrenceHash: "grandparent" },
		],
	});
	const parent = await createPageWithSegments({
		userId: user.id,
		mdastJson: { type: "root", children: [] },
		slug: "parent",
		segments: [{ number: 0, text: "親", textAndOccurrenceHash: "parent" }],
	});
	const child = await createPageWithSegments({
		userId: user.id,
		mdastJson: { type: "root", children: [] },
		slug: "child",
		segments: [{ number: 0, text: "子", textAndOccurrenceHash: "child" }],
	});
	await db
		.updateTable("pages")
		.set({ parentId: grandparent.id })
		.where("id", "=", parent.id)
		.execute();
	await db
		.updateTable("pages")
		.set({ parentId: parent.id })
		.where("id", "=", child.id)
		.execute();
	const siblingUser = await createUser();
	const sibling = await createPageWithSegments({
		userId: siblingUser.id,
		slug: "sibling",
		segments: [
			{ number: 0, text: "同じ階層", textAndOccurrenceHash: "sibling" },
		],
	});
	await db
		.updateTable("pages")
		.set({ parentId: parent.id })
		.where("id", "=", sibling.id)
		.execute();
	const result = await loadReaderData(
		`/ja/${user.handle}/${child.slug}`,
		"",
		new Headers(),
	);
	expect(result?.cacheKeys).toEqual(
		expect.arrayContaining([
			`author:${grandparentUser.handle}`,
			`author:${siblingUser.handle}`,
		]),
	);
});

it("見出しのない祖先も依存へ含め後から作成されたナビゲーションを反映できる", async () => {
	const user = await createUser();
	const grandparent = await createPage({
		userId: user.id,
		slug: "untitled-root",
		status: "PUBLIC",
	});
	const parent = await createPage({
		userId: user.id,
		slug: "untitled-parent",
		status: "PUBLIC",
	});
	const child = await createPageWithSegments({
		userId: user.id,
		slug: "titled-child",
		mdastJson: { type: "root", children: [] },
		segments: [{ number: 0, text: "子", textAndOccurrenceHash: "child" }],
	});
	await db
		.updateTable("pages")
		.set({ parentId: grandparent.id })
		.where("id", "=", parent.id)
		.execute();
	await db
		.updateTable("pages")
		.set({ parentId: parent.id })
		.where("id", "=", child.id)
		.execute();
	const result = await loadReaderData(
		`/ja/${user.handle}/${child.slug}`,
		"",
		new Headers(),
	);
	expect(result?.cacheKeys).toEqual(
		expect.arrayContaining([`page:${grandparent.id}`, `page:${parent.id}`]),
	);
});
