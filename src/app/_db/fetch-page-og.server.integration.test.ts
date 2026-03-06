import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchPageOgData } from "./fetch-page-og.server";

await setupDbPerFile(import.meta.url);

describe("fetchPageOgData", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ページタイトルと最良翻訳とユーザー名を返す", async () => {
		const pageOwner = await createUser({
			handle: "evame-owner",
			name: "Evame Owner",
		});
		const translator = await createUser({ handle: "translator" });
		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "og-page",
			segments: [
				{
					number: 0,
					text: "Cloudflare",
					textAndOccurrenceHash: "title-hash",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const titleSegment = await db
			.selectFrom("segments")
			.select(["id"])
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: titleSegment.id,
				locale: "ja",
				text: "クラウドフレア",
				point: 10,
				userId: translator.id,
			})
			.execute();

		const result = await fetchPageOgData("og-page", "ja");

		expect(result).toEqual({
			id: page.id,
			title: "Cloudflare - クラウドフレア",
			userHandle: "evame-owner",
			userName: "Evame Owner",
		});
	});

	it("ARCHIVE ページは null を返す", async () => {
		const pageOwner = await createUser();
		await createPageWithSegments({
			userId: pageOwner.id,
			slug: "archived-og-page",
			status: "ARCHIVE",
			segments: [
				{
					number: 0,
					text: "Archived",
					textAndOccurrenceHash: "archived-title-hash",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		await expect(fetchPageOgData("archived-og-page", "ja")).resolves.toBeNull();
	});
});
