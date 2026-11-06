import { expect, it } from "vitest";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { readerDocumentSourcePath } from "@/app/_domain/reader-document";
import type { fetchReaderCatalogSources } from "../_db/queries";
import { buildReaderDocuments } from "./reader-documents";

function sources(): Awaited<ReturnType<typeof fetchReaderCatalogSources>> {
	return {
		revision: 1,
		stats: { articles: 1, translations: 0, languages: 18 },
		users: [{ id: "owner", handle: "author", revision: 0 }],
		tags: [{ pageId: 1, name: "日記" }],
		commentAuthors: [],
		follows: [],
		pages: [
			{
				id: 1,
				slug: "article",
				userId: "owner",
				parentId: null,
				status: "PUBLIC",
				createdAt: 0,
				hasTitle: 1,
				likes: 0,
				views: 0,
				commentRoots: 21,
				revision: 1,
				navigationRevision: 1,
			},
		],
	};
}

it("日本語と他言語のAboutを区別しながら、全21言語の生成元を共用できる", () => {
	const source = sources();
	source.pages.push(
		{ ...source.pages[0], id: 2, slug: "evame", revision: 2 },
		{ ...source.pages[0], id: 3, slug: "evame-ja", revision: 3 },
	);
	const shared = Object.fromEntries(
		Object.entries({
			...buildReaderDocuments(source, "ja"),
			...buildReaderDocuments(source, "en"),
		}).map(([path, hash]) => [readerDocumentSourcePath(path), hash]),
	);
	for (const { code } of supportedLocaleOptions)
		for (const [path, hash] of Object.entries(
			buildReaderDocuments(source, code),
		))
			expect(shared[readerDocumentSourcePath(path)]).toBe(hash);
	expect(shared["/about/evame"]).not.toBe(shared["/about/evame-ja"]);
});

it("記事・コメントの途中ページ・著者の並べ替え・タグを21言語の3表示で事前生成する", () => {
	for (const { code } of supportedLocaleOptions)
		expect(
			buildReaderDocuments(sources(), code)[
				`/${code}/author/article?view=source`
			],
		).toBeDefined();
	const documents = buildReaderDocuments(sources(), "ja");
	for (const path of [
		"/ja",
		"/ja/author/article",
		"/ja/author/article?page=2",
		"/ja/author?sort=new",
		"/ja/tag/%E6%97%A5%E8%A8%98",
		"/ja/new-pages",
	]) {
		expect(documents[path]).toBeDefined();
		expect(
			documents[`${path}${path.includes("?") ? "&" : "?"}view=source`],
		).toBeDefined();
	}
	expect(documents["/ja/search"]).toBeUndefined();
});

it("記事を非公開にすると本文とコメントのHTMLを廃棄し掲載する一覧を作り直す", () => {
	const source = sources();
	const before = buildReaderDocuments(source, "ja");
	source.pages[0].status = "DRAFT";
	source.pages[0].revision++;
	const after = buildReaderDocuments(source, "ja");
	expect(after["/ja/author/article"]).toBeUndefined();
	expect(after["/ja/author/article?page=2"]).toBeUndefined();
	expect(after["/ja"]).not.toBe(before["/ja"]);
	expect(after["/ja/author"]).not.toBe(before["/ja/author"]);
	expect(after["/ja/tag/%E6%97%A5%E8%A8%98"]).not.toBe(
		before["/ja/tag/%E6%97%A5%E8%A8%98"],
	);
});

it("記事を編集しても無関係な著者の記事のHTMLは生成し直さない", () => {
	const source = sources();
	source.pages.push({
		...source.pages[0],
		id: 2,
		slug: "other",
		userId: "other-owner",
	});
	source.users.push({ id: "other-owner", handle: "other", revision: 0 });
	const before = buildReaderDocuments(source, "ja");
	source.pages[0].revision++;
	const after = buildReaderDocuments(source, "ja");
	expect(after["/ja/author/article"]).not.toBe(before["/ja/author/article"]);
	expect(after["/ja/other/other"]).toBe(before["/ja/other/other"]);
});

it("子記事の見出し変更を同じ階層のナビゲーションへ反映する", () => {
	const source = sources();
	source.pages.push({ ...source.pages[0], id: 2, slug: "child", parentId: 1 });
	const before = buildReaderDocuments(source, "ja");
	source.pages[1].revision++;
	source.pages[1].navigationRevision++;
	const after = buildReaderDocuments(source, "ja");
	expect(after["/ja/author/article"]).not.toBe(before["/ja/author/article"]);
});

it("子記事の本文だけを編集したときは、同じ階層の他の記事を再生成しない", () => {
	const source = sources();
	source.pages.push({ ...source.pages[0], id: 2, slug: "child", parentId: 1 });
	const before = buildReaderDocuments(source, "ja");
	source.pages[1].revision++;
	const after = buildReaderDocuments(source, "ja");
	expect(after["/ja/author/article"]).toBe(before["/ja/author/article"]);
	expect(after["/ja/author/child"]).not.toBe(before["/ja/author/child"]);
});

it("同じ階層で最後に編集された記事以外を削除しても、ツリーのHTMLを更新する", () => {
	const source = sources();
	source.pages.push(
		{
			...source.pages[0],
			id: 2,
			slug: "child-1",
			parentId: 1,
			navigationRevision: 2,
		},
		{
			...source.pages[0],
			id: 3,
			slug: "child-2",
			parentId: 1,
			navigationRevision: 3,
		},
	);
	const before = buildReaderDocuments(source, "ja");
	source.pages = source.pages.filter((page) => page.id !== 2);
	expect(buildReaderDocuments(source, "ja")["/ja/author/article"]).not.toBe(
		before["/ja/author/article"],
	);
});
