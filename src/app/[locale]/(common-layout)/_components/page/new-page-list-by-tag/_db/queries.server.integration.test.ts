import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import {
	fetchPaginatedPublicNewestPageListsByTag,
	fetchPublicNewestPageListsByTags,
} from "./queries.server";

await setupDbPerFile(import.meta.url);

async function attachTag(pageId: number, name: string) {
	const existing = await db
		.selectFrom("tags")
		.selectAll()
		.where("name", "=", name)
		.executeTakeFirst();

	const tag =
		existing ??
		(await db
			.insertInto("tags")
			.values({ name })
			.returningAll()
			.executeTakeFirstOrThrow());

	await db.insertInto("tagPages").values({ tagId: tag.id, pageId }).execute();
}

async function setCreatedAt(pageId: number, createdAt: Date) {
	await db
		.updateTable("pages")
		.set({ createdAt })
		.where("id", "=", pageId)
		.execute();
}

describe("fetchPaginatedPublicNewestPageListsByTag", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("タグ別の新着ページを作成日時の降順で返す", async () => {
		const user = await createUser();

		const pageOld = await createPageWithSegments({
			userId: user.id,
			slug: "ai-old",
			segments: [
				{
					number: 0,
					text: "Old Title",
					textAndOccurrenceHash: "hash-old",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const pageMid = await createPageWithSegments({
			userId: user.id,
			slug: "ai-mid",
			segments: [
				{
					number: 0,
					text: "Mid Title",
					textAndOccurrenceHash: "hash-mid",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const pageNew = await createPageWithSegments({
			userId: user.id,
			slug: "ai-new",
			segments: [
				{
					number: 0,
					text: "New Title",
					textAndOccurrenceHash: "hash-new",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const pageOther = await createPageWithSegments({
			userId: user.id,
			slug: "other-tag",
			segments: [
				{
					number: 0,
					text: "Other Title",
					textAndOccurrenceHash: "hash-other",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		await attachTag(pageOld.id, "AI");
		await attachTag(pageMid.id, "AI");
		await attachTag(pageNew.id, "AI");
		await attachTag(pageOther.id, "Other");

		const base = new Date("2026-02-05T00:00:00.000Z");
		await setCreatedAt(pageOld.id, new Date(base.getTime() - 60_000));
		await setCreatedAt(pageMid.id, new Date(base.getTime() - 30_000));
		await setCreatedAt(pageNew.id, new Date(base.getTime()));
		await setCreatedAt(pageOther.id, new Date(base.getTime() + 10_000));

		const first = await fetchPaginatedPublicNewestPageListsByTag({
			tagName: "AI",
			page: 1,
			pageSize: 2,
			locale: "en",
		});

		expect(first.totalPages).toBe(2);
		expect(first.pageForLists.map((page) => page.slug)).toEqual([
			"ai-new",
			"ai-mid",
		]);

		const second = await fetchPaginatedPublicNewestPageListsByTag({
			tagName: "AI",
			page: 2,
			pageSize: 2,
			locale: "en",
		});

		expect(second.pageForLists.map((page) => page.slug)).toEqual(["ai-old"]);
	});
});

describe("fetchPublicNewestPageListsByTags", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("複数タグの新着ページをタグごとにまとめて返す", async () => {
		const user = await createUser();

		const aiOld = await createPageWithSegments({
			userId: user.id,
			slug: "ai-old",
			segments: [
				{
					number: 0,
					text: "AI Old",
					textAndOccurrenceHash: "hash-ai-old",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const aiNew = await createPageWithSegments({
			userId: user.id,
			slug: "ai-new",
			segments: [
				{
					number: 0,
					text: "AI New",
					textAndOccurrenceHash: "hash-ai-new",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const aiNewest = await createPageWithSegments({
			userId: user.id,
			slug: "ai-newest",
			segments: [
				{
					number: 0,
					text: "AI Newest",
					textAndOccurrenceHash: "hash-ai-newest",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const progOld = await createPageWithSegments({
			userId: user.id,
			slug: "prog-old",
			segments: [
				{
					number: 0,
					text: "Prog Old",
					textAndOccurrenceHash: "hash-prog-old",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const progNew = await createPageWithSegments({
			userId: user.id,
			slug: "prog-new",
			segments: [
				{
					number: 0,
					text: "Prog New",
					textAndOccurrenceHash: "hash-prog-new",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const progNewest = await createPageWithSegments({
			userId: user.id,
			slug: "prog-newest",
			segments: [
				{
					number: 0,
					text: "Prog Newest",
					textAndOccurrenceHash: "hash-prog-newest",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const other = await createPageWithSegments({
			userId: user.id,
			slug: "other-tag",
			segments: [
				{
					number: 0,
					text: "Other",
					textAndOccurrenceHash: "hash-other",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		await attachTag(aiOld.id, "AI");
		await attachTag(aiNew.id, "AI");
		await attachTag(aiNewest.id, "AI");
		await attachTag(progOld.id, "Programming");
		await attachTag(progNew.id, "Programming");
		await attachTag(progNewest.id, "Programming");
		await attachTag(other.id, "Other");

		const base = new Date("2026-02-05T00:00:00.000Z");
		await setCreatedAt(aiOld.id, new Date(base.getTime() - 50_000));
		await setCreatedAt(aiNew.id, new Date(base.getTime() - 30_000));
		await setCreatedAt(aiNewest.id, new Date(base.getTime() - 10_000));

		await setCreatedAt(progOld.id, new Date(base.getTime() - 40_000));
		await setCreatedAt(progNew.id, new Date(base.getTime() - 20_000));
		await setCreatedAt(progNewest.id, new Date(base.getTime()));

		await setCreatedAt(other.id, new Date(base.getTime() + 10_000));

		const result = await fetchPublicNewestPageListsByTags({
			tagNames: ["AI", "Programming"],
			pageSize: 2,
			locale: "en",
		});

		expect(result.map((entry) => entry.tagName)).toEqual(["AI", "Programming"]);

		const aiResult = result.find((entry) => entry.tagName === "AI");
		const progResult = result.find((entry) => entry.tagName === "Programming");

		expect(aiResult?.pageForLists.map((page) => page.slug)).toEqual([
			"ai-newest",
			"ai-new",
		]);
		expect(progResult?.pageForLists.map((page) => page.slug)).toEqual([
			"prog-newest",
			"prog-new",
		]);
	});
});
