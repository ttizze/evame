import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { editPageTags } from "./action";

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

describe("editPageTags", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("無効なタグ名を送信するとバリデーションエラーを返す", async () => {
		const formData = new FormData();
		formData.set("pageId", "1");
		formData.set("tags", JSON.stringify(["invalid tag"]));

		const result = await editPageTags({ data: formData });
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("タグが5個を超える場合、バリデーションエラーを返す", async () => {
		const formData = new FormData();
		formData.set("pageId", "1");
		formData.set("tags", JSON.stringify(["a", "b", "c", "d", "e", "f"]));

		const result = await editPageTags({ data: formData });
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("所有者が有効なタグを送信するとタグを保存する", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "tag-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));
		const formData = new FormData();
		formData.set("pageId", String(page.id));
		formData.set("tags", JSON.stringify(["tag1", "tag2"]));

		const result = await editPageTags({ data: formData });
		expect(result.success).toBe(true);
		const rows = await db
			.selectFrom("tagPages")
			.innerJoin("tags", "tags.id", "tagPages.tagId")
			.select("tags.name")
			.where("tagPages.pageId", "=", page.id)
			.execute();
		expect(rows.map((row) => row.name).sort()).toEqual(["tag1", "tag2"]);
	});

	it("ページ所有者でないユーザーはタグを更新できない", async () => {
		const owner = await createUser();
		const otherUser = await createUser();
		const page = await createPage({ userId: owner.id, slug: "owned-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
			toSessionUser(otherUser),
		);
		const formData = new FormData();
		formData.set("pageId", String(page.id));
		formData.set("tags", JSON.stringify(["tag1"]));

		await expect(editPageTags({ data: formData })).rejects.toBeDefined();
	});
});
