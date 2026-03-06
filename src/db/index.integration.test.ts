import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { setupDbPerFile } from "@/tests/test-db-manager";

await setupDbPerFile(import.meta.url);

describe("db", () => {
	it("ローカルテストDBでマスターデータを取得できる", async () => {
		const primarySegmentType = await db
			.selectFrom("segmentTypes")
			.select(["key"])
			.where("key", "=", "PRIMARY")
			.executeTakeFirst();

		expect(primarySegmentType?.key).toBe("PRIMARY");
	});
});
