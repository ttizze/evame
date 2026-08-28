import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { editPageStatus } from "./action";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: <T>(handler: T) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => new Headers(),
}));

await setupDbPerFile(import.meta.url);

describe("editPageStatus", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("未認証の場合、ログインページへリダイレクトする", async () => {
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
		const formData = new FormData();
		formData.set("pageId", "1");
		formData.set("status", "DRAFT");
		formData.set("targetLocales", "en");

		await expect(editPageStatus({ data: formData })).rejects.toBeDefined();
	});

	it("pageIdが指定されていない場合、バリデーションエラーを返す", async () => {
		const formData = new FormData();
		formData.set("status", "DRAFT");
		formData.set("targetLocales", "en");

		const result = await editPageStatus({ data: formData });
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors?.pageId).toBeDefined();
	});

	it("所有者がDRAFTを選択するとページの公開状態を更新する", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "status-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
		const formData = new FormData();
		formData.set("pageId", String(page.id));
		formData.set("status", "DRAFT");
		formData.set("targetLocales", "en");

		const result = await editPageStatus({ data: formData });
		expect(result.success).toBe(true);
		const updated = await db
			.selectFrom("pages")
			.select("status")
			.where("id", "=", page.id)
			.executeTakeFirstOrThrow();
		expect(updated.status).toBe("DRAFT");
	});

	it("他のユーザーのページはステータスを変更できない", async () => {
		const owner = await createUser();
		const otherUser = await createUser();
		const page = await createPage({ userId: owner.id, slug: "owned-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
			toSessionUser(otherUser),
		);
		const formData = new FormData();
		formData.set("pageId", String(page.id));
		formData.set("status", "PUBLIC");
		formData.set("targetLocales", "en");

		await expect(editPageStatus({ data: formData })).rejects.toBeDefined();
	});
});
