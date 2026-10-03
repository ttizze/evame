import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { queryPageDetail } from "./queries";

await setupDbPerFile(import.meta.url);

describe("queryPageDetail", () => {
	beforeEach(async () => {
		await resetDatabase();
	});
	it("公開日時があってもARCHIVEの記事を取得しない", async () => {
		const user = await createUser();
		await createPage({
			publishedAt: new Date("2026-01-01T00:00:00.000Z"),
			slug: "archived-page",
			status: "ARCHIVE",
			userId: user.id,
		});
		await expect(queryPageDetail("archived-page", "ja")).resolves.toBeNull();
	});
});
