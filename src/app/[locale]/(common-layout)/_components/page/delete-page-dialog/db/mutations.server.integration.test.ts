import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { archivePage } from "./mutations.server";

await setupDbPerFile(import.meta.url);

describe("archivePage", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("所有者がページをアーカイブできる", async () => {
		const owner = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "page",
			status: "PUBLIC",
		});

		const result = await archivePage(page.id, owner.id);

		expect(result.status).toBe("ARCHIVE");
	});

	it("他のユーザーのページはアーカイブできない", async () => {
		const owner = await createUser();
		const otherUser = await createUser();
		const page = await createPage({ userId: owner.id, slug: "page" });

		await expect(archivePage(page.id, otherUser.id)).rejects.toThrow(
			"Page not found or unauthorized",
		);
	});

	it("アーカイブ状態をデータベースにも保存する", async () => {
		const owner = await createUser();
		const page = await createPage({ userId: owner.id, slug: "page" });

		await archivePage(page.id, owner.id);

		const archivedPage = await db
			.selectFrom("pages")
			.select("status")
			.where("id", "=", page.id)
			.executeTakeFirstOrThrow();
		expect(archivedPage.status).toBe("ARCHIVE");
	});
});
