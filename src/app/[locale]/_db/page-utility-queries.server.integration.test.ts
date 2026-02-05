import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchPageViewCounts } from "./page-utility-queries.server";

await setupDbPerFile(import.meta.url);

describe("fetchPageViewCounts", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ページIDごとの閲覧数をまとめて返す", async () => {
		const user = await createUser();
		const pageA = await createPage({ userId: user.id, slug: "page-a" });
		const pageB = await createPage({ userId: user.id, slug: "page-b" });

		await db
			.insertInto("pageViews")
			.values([
				{ pageId: pageA.id, count: 12 },
				{ pageId: pageB.id, count: 0 },
			])
			.execute();

		const result = await fetchPageViewCounts([pageA.id, pageB.id, pageA.id]);

		expect(result.get(pageA.id)).toBe(12);
		expect(result.get(pageB.id)).toBe(0);
	});
});
