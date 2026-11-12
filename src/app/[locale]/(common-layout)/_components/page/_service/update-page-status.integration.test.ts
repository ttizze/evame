import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { updatePageStatus } from "./update-page-status";

await setupDbPerFile(import.meta.url);
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));

describe("管理画面の記事管理", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});
	it("所有者が管理画面から記事を非公開にして削除できる", async () => {
		const owner = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "owner-page",
			status: "PUBLIC",
		});
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
			toSessionUser(owner),
		);
		expect(
			await updatePageStatus(
				{ locale: "ja", pageId: page.id, operation: "togglePublish" },
				new Headers(),
			),
		).toMatchObject({ success: true });
		expect(
			await db
				.selectFrom("pages")
				.select("status")
				.where("id", "=", page.id)
				.executeTakeFirstOrThrow(),
		).toEqual({ status: "DRAFT" });
		expect(
			await updatePageStatus(
				{ locale: "ja", pageId: page.id, operation: "archive" },
				new Headers(),
			),
		).toMatchObject({ success: true });
		expect(
			await db
				.selectFrom("pages")
				.select("status")
				.where("id", "=", page.id)
				.executeTakeFirstOrThrow(),
		).toEqual({ status: "ARCHIVE" });
	});
	it("未ログインの操作は現在の言語のログイン画面へ遷移する", async () => {
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
		await expect(
			updatePageStatus(
				{ locale: "ja", pageId: 1, operation: "archive" },
				new Headers(),
			),
		).rejects.toMatchObject({ options: { href: "/ja/auth/login" } });
	});
	it("他人の記事を非公開や削除にできない", async () => {
		const owner = await createUser();
		const other = await createUser();
		const page = await createPage({
			userId: owner.id,
			slug: "other-page",
			status: "PUBLIC",
		});
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
			toSessionUser(other),
		);
		await expect(
			updatePageStatus(
				{ locale: "ja", pageId: page.id, operation: "togglePublish" },
				new Headers(),
			),
		).rejects.toThrow("Unauthorized");
		await expect(
			updatePageStatus(
				{ locale: "ja", pageId: page.id, operation: "archive" },
				new Headers(),
			),
		).rejects.toThrow("unauthorized");
		expect(
			await db
				.selectFrom("pages")
				.select("status")
				.where("id", "=", page.id)
				.executeTakeFirstOrThrow(),
		).toEqual({ status: "PUBLIC" });
	});
});
