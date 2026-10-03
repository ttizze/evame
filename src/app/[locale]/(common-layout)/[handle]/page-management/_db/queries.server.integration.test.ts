import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchPageViewCounts, fetchPaginatedOwnPages } from "./queries.server";

await setupDbPerFile(import.meta.url);

describe("fetchPaginatedOwnPages", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("所有者の公開・下書きだけをタイトル付きで返す", async () => {
		const owner = await createUser();
		const otherUser = await createUser();
		const publicPage = await createPageWithSegments({
			userId: owner.id,
			slug: "public-page",
			status: "PUBLIC",
			segments: [
				{
					number: 0,
					text: "Public title",
					textAndOccurrenceHash: "public-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const draftPage = await createPageWithSegments({
			userId: owner.id,
			slug: "draft-page",
			status: "DRAFT",
			segments: [
				{
					number: 0,
					text: "Draft title",
					textAndOccurrenceHash: "draft-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		await createPageWithSegments({
			userId: owner.id,
			slug: "archived-page",
			status: "ARCHIVE",
			segments: [
				{
					number: 0,
					text: "Archived title",
					textAndOccurrenceHash: "archived-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		await createPageWithSegments({
			userId: otherUser.id,
			slug: "other-page",
			status: "PUBLIC",
			segments: [
				{
					number: 0,
					text: "Other title",
					textAndOccurrenceHash: "other-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const result = await fetchPaginatedOwnPages(owner.id, "en");

		expect(result.pagesWithTitle).toHaveLength(2);
		expect(result.pagesWithTitle.map((page) => page.slug).sort()).toEqual([
			"draft-page",
			"public-page",
		]);
		expect(
			result.pagesWithTitle.find((page) => page.id === publicPage.id)?.title,
		).toBe("Public title");
		expect(
			result.pagesWithTitle.find((page) => page.id === draftPage.id)?.title,
		).toBe("Draft title");
	});

	it("タイトル検索は所有者の公開・下書きだけに絞り込む", async () => {
		const owner = await createUser();
		const otherUser = await createUser();
		await createPageWithSegments({
			userId: owner.id,
			slug: "owner-match",
			segments: [
				{
					number: 0,
					text: "Matching title",
					textAndOccurrenceHash: "owner-match",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		await createPageWithSegments({
			userId: otherUser.id,
			slug: "other-match",
			segments: [
				{
					number: 0,
					text: "Matching title",
					textAndOccurrenceHash: "other-match",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const result = await fetchPaginatedOwnPages(
			owner.id,
			"en",
			1,
			10,
			"matching",
		);

		expect(result.pagesWithTitle.map((page) => page.slug)).toEqual([
			"owner-match",
		]);
	});
});

describe("fetchPageViewCounts", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("指定したページの閲覧数をID別に返す", async () => {
		const owner = await createUser();
		const firstPage = await createPageWithSegments({
			userId: owner.id,
			slug: "first-page",
			segments: [
				{
					number: 0,
					text: "First title",
					textAndOccurrenceHash: "first-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const secondPage = await createPageWithSegments({
			userId: owner.id,
			slug: "second-page",
			segments: [
				{
					number: 0,
					text: "Second title",
					textAndOccurrenceHash: "second-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		await db
			.insertInto("pageViews")
			.values({ pageId: firstPage.id, count: 7 })
			.execute();

		expect(await fetchPageViewCounts([firstPage.id, secondPage.id])).toEqual({
			[firstPage.id]: 7,
		});
	});
});
