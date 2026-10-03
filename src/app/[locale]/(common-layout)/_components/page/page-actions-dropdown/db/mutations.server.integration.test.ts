import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { togglePagePublicStatus } from "./mutations.server";

await setupDbPerFile(import.meta.url);

describe("togglePagePublicStatus", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("所有者が公開ページを下書きに切り替えられる", async () => {
		const owner = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "page",
			status: "PUBLIC",
		});

		const result = await togglePagePublicStatus(page.id, owner.id);

		expect(result.status).toBe("DRAFT");
	});

	it("所有者が下書きページを公開に切り替えられる", async () => {
		const owner = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "page",
			status: "DRAFT",
		});

		const result = await togglePagePublicStatus(page.id, owner.id);

		expect(result.status).toBe("PUBLIC");
	});

	it("他のユーザーのページは切り替えられない", async () => {
		const owner = await createUser();
		const otherUser = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "page",
			status: "PUBLIC",
		});

		await expect(togglePagePublicStatus(page.id, otherUser.id)).rejects.toThrow(
			"Unauthorized",
		);
	});

	it("存在しないページは切り替えられない", async () => {
		const owner = await createUser();

		await expect(togglePagePublicStatus(999999, owner.id)).rejects.toThrow(
			"Page not found",
		);
	});

	it("更新後のページをデータベースにも保存する", async () => {
		const owner = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "page",
			status: "PUBLIC",
		});

		await togglePagePublicStatus(page.id, owner.id);

		const updatedPage = await db
			.selectFrom("pages")
			.select("status")
			.where("id", "=", page.id)
			.executeTakeFirstOrThrow();
		expect(updatedPage.status).toBe("DRAFT");
	});
});
