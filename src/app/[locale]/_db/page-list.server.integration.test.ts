import { CompiledQuery } from "kysely";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import {
	buildPageListQuery,
	fetchPaginatedPageLists,
} from "./page-list.server";

await setupDbPerFile(import.meta.url);

describe("ページ一覧", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("人気一覧は選んだページIDから本文・著者情報を取得する", async () => {
		const execute = vi.spyOn(db.getExecutor(), "executeQuery");
		await fetchPaginatedPageLists({
			locale: "ja",
			page: 1,
			pageSize: 5,
			pageOwnerId: null,
			sort: "popular",
		});
		const query = execute.mock.calls.find(([query]) =>
			query.sql.includes('"pages"."slug"'),
		)?.[0];
		expect(query).toBeDefined();
		if (!query) throw new Error("人気一覧のクエリが実行されていません");
		const plan = await db.executeQuery<{ detail: string }>(
			CompiledQuery.raw(`EXPLAIN QUERY PLAN ${query.sql}`, [
				...query.parameters,
			]),
		);
		expect(
			plan.rows.some(({ detail }) =>
				/SEARCH pages USING INTEGER PRIMARY KEY/.test(detail),
			),
		).toBe(true);
	});

	it.each([
		["人気", "popular", ["first", "second", "third"]],
		["新着", "new", ["third", "first", "second"]],
	] as const)(
		"%s一覧のページ分けで非公開・子記事・タイトルなし・他の著者を除外する",
		async (_name, sort, slugs) => {
			const owner = await createUser();
			const other = await createUser();
			const voters = await Promise.all([
				createUser(),
				createUser(),
				createUser(),
			]);
			let parentId: number | null = null;
			for (const [slug, likes, date] of [
				["first", 2, "2026-01-02"],
				["second", 2, "2026-01-01"],
				["third", 1, "2026-01-03"],
				["draft", 3, "2026-01-04"],
				["child", 3, "2026-01-05"],
				["other", 3, "2026-01-06"],
			] as const) {
				const page = await createPageWithSegments({
					userId: slug === "other" ? other.id : owner.id,
					slug,
					status: slug === "draft" ? "DRAFT" : "PUBLIC",
					segments: [{ number: 0, text: slug, textAndOccurrenceHash: slug }],
				});
				await db
					.updateTable("pages")
					.set({
						createdAt: new Date(date),
						parentId: slug === "child" ? parentId : null,
					})
					.where("id", "=", page.id)
					.execute();
				if (slug === "first") parentId = page.id;
				await db
					.insertInto("likePages")
					.values(
						voters
							.slice(0, likes)
							.map((user) => ({ userId: user.id, pageId: page.id })),
					)
					.execute();
			}
			const titleless = await createPage({
				userId: owner.id,
				slug: "titleless",
			});
			await db
				.insertInto("likePages")
				.values(
					voters.map((user) => ({ userId: user.id, pageId: titleless.id })),
				)
				.execute();
			const results = [];
			for (const page of [1, 2, 3, 4])
				results.push(
					await fetchPaginatedPageLists({
						locale: "ja",
						page,
						pageSize: 1,
						pageOwnerId: owner.id,
						sort,
					}),
				);
			expect(
				results.map((result) => result.pageForLists.map((row) => row.slug)),
			).toEqual([...slugs.map((slug) => [slug]), []]);
			expect(results.map((result) => result.totalPages)).toEqual([3, 3, 3, 3]);
		},
	);

	it.each([
		["新着", "new"],
		["人気", "popular"],
	] as const)(
		"%s一覧の各タイトルでその記事の著者が賛成した翻訳を表示する",
		async (_name, sort) => {
			const owners = await Promise.all([createUser(), createUser()]);
			for (const [index, owner] of owners.entries()) {
				const page = await createPageWithSegments({
					userId: owner.id,
					slug: `page-${index}`,
					segments: [
						{
							number: 0,
							text: `Title ${index}`,
							textAndOccurrenceHash: `title-${index}`,
						},
					],
				});
				const segment = await db
					.selectFrom("segments")
					.select("id")
					.where("contentId", "=", page.id)
					.executeTakeFirstOrThrow();
				const translations = await db
					.insertInto("segmentTranslations")
					.values(
						owners.map((user, choice) => ({
							segmentId: segment.id,
							locale: "ja",
							text: `翻訳${choice}`,
							point: 100,
							userId: user.id,
						})),
					)
					.returningAll()
					.execute();
				await db
					.insertInto("translationVotes")
					.values({
						translationId: translations[index].id,
						userId: owner.id,
						isUpvote: true,
					})
					.execute();
			}
			const result = await fetchPaginatedPageLists({
				locale: "ja",
				page: 1,
				pageSize: 5,
				pageOwnerId: null,
				sort,
			});
			expect(
				Object.fromEntries(
					result.pageForLists.map((page) => [
						page.slug,
						page.titleSegment.translationText,
					]),
				),
			).toEqual({ "page-0": "翻訳0", "page-1": "翻訳1" });
		},
	);

	it("5件のタイトル取得で全記事の翻訳を走査しない", async () => {
		const query = buildPageListQuery("ja")
			.where("pages.status", "=", "PUBLIC")
			.where("pages.parentId", "is", null)
			.orderBy("pages.createdAt", "desc")
			.limit(5);
		const compiled = query.compile();
		const plan = await db.executeQuery<{ detail: string }>(
			CompiledQuery.raw(`EXPLAIN QUERY PLAN ${compiled.sql}`, [
				...compiled.parameters,
			]),
		);
		expect(
			plan.rows.filter(({ detail }) =>
				/^SCAN segment_translations\b/i.test(detail),
			),
		).toEqual([]);
	});

	it("削除されていないコメント数をページ一覧に含める", async () => {
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "page-with-comments",
			segments: [
				{
					number: 0,
					text: "Page title",
					textAndOccurrenceHash: "page-title",
				},
			],
		});

		for (const isDeleted of [false, true]) {
			const content = await db
				.insertInto("contents")
				.values({ kind: "PAGE_COMMENT" })
				.returningAll()
				.executeTakeFirstOrThrow();
			await db
				.insertInto("pageComments")
				.values({
					id: content.id,
					isDeleted,
					mdastJson: { type: "root", children: [] },
					pageId: page.id,
					userId: user.id,
					locale: "en",
				})
				.execute();
		}

		const result = await fetchPaginatedPageLists({
			locale: "en",
			page: 1,
			pageSize: 10,
			pageOwnerId: null,
			sort: "new",
		});

		expect(result.pageForLists[0]?.pageCommentsCount).toBe(1);
	});
});
