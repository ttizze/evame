import { beforeEach, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { loadHomePage } from "./load-home-page";

vi.mock("../../about-section/service/load-about-page", () => ({
	loadAboutPage: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../about-section/service/load-social-proof-stats", () => ({
	loadSocialProofStats: vi
		.fn()
		.mockResolvedValue({ articles: 6, translations: 12, languages: 18 }),
}));

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

it("ホームは新着・人気記事と共通タグだけを取得し件数は集計を再利用する", async () => {
	const owner = await createUser();
	const page = await createPageWithSegments({
		userId: owner.id,
		slug: "public",
		segments: [
			{ number: 0, text: "公開記事", textAndOccurrenceHash: "public" },
		],
	});
	const tag = await db
		.insertInto("tags")
		.values({ name: "test" })
		.returning("id")
		.executeTakeFirstOrThrow();
	await db
		.insertInto("tagPages")
		.values({ tagId: tag.id, pageId: page.id })
		.execute();
	const execute = vi.spyOn(db.getExecutor(), "executeQuery");
	const home = await loadHomePage("ja");
	expect(home.newPages.pageForLists.map((row) => row.slug)).toEqual(["public"]);
	expect(home.popularPages.pageForLists).toEqual(home.newPages.pageForLists);
	expect(home.newPages.pageForLists[0].tags).toEqual([
		{ id: tag.id, name: "test" },
	]);
	expect([home.newPages.totalPages, home.popularPages.totalPages]).toEqual([
		2, 2,
	]);
	expect(execute).toHaveBeenCalledTimes(3);

	await db
		.updateTable("pages")
		.set({ status: "DRAFT" })
		.where("id", "=", page.id)
		.execute();
	const updated = await loadHomePage("ja");
	expect(updated.stats.articles).toBe(6);
	expect(updated.newPages.pageForLists).toEqual([]);
	expect(updated.popularPages.pageForLists).toEqual([]);
});
