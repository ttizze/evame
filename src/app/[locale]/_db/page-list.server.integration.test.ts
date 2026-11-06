import { CompiledQuery } from "kysely";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import {
	buildPageListQuery,
	fetchPaginatedNewPageLists,
	fetchPaginatedPopularPageLists,
} from "./page-list.server";

await setupDbPerFile(import.meta.url);

describe("fetchPaginatedNewPageLists", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it.each([
		["新着", fetchPaginatedNewPageLists],
		["人気", fetchPaginatedPopularPageLists],
	])(
		"%s一覧の各タイトルでその記事の著者が賛成した翻訳を表示する",
		async (_name, fetchList) => {
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
			const result = await fetchList({ locale: "ja", page: 1, pageSize: 5 });
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

		const result = await fetchPaginatedNewPageLists({
			locale: "en",
			page: 1,
			pageSize: 10,
		});

		expect(result.pageForLists[0]?.pageCommentsCount).toBe(1);
	});
});
