import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchPaginatedNewPageLists } from "./page-list.server";

await setupDbPerFile(import.meta.url);

describe("fetchPaginatedNewPageLists", () => {
	beforeEach(async () => {
		await resetDatabase();
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
					segmentTypeKey: "PRIMARY",
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
