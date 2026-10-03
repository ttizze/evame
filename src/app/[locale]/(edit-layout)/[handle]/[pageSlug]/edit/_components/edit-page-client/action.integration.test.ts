import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { editPageContent } from "./action";

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

describe("editPageContent", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("無効な入力データが渡された場合、バリデーションエラーを返す", async () => {
		const formData = new FormData();
		formData.set("pageSlug", "");
		formData.set("title", "");
		formData.set("userLocale", "en");
		formData.set("pageContent", "");

		const result = await editPageContent({ data: formData });

		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("所有者が有効な入力データを送信すると既存ページを保存する", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.set("pageSlug", page.slug);
		formData.set("title", "Updated Title");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>Updated content</p>");

		const result = await editPageContent({ data: formData });

		expect(result.success).toBe(true);
		const updatedPage = await db
			.selectFrom("pages")
			.selectAll()
			.where("id", "=", page.id)
			.executeTakeFirst();
		expect(updatedPage?.slug).toBe(page.slug);
	});

	it("所有者が未作成のslugを保存すると新規ページを作成する", async () => {
		const user = await createUser();
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.set("pageSlug", "new-page");
		formData.set("title", "New Page");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>New content</p>");

		const result = await editPageContent({ data: formData });

		expect(result.success).toBe(true);
		const createdPage = await db
			.selectFrom("pages")
			.select(["slug", "userId", "status"])
			.where("slug", "=", "new-page")
			.executeTakeFirstOrThrow();
		expect(createdPage).toEqual({
			slug: "new-page",
			userId: user.id,
			status: "DRAFT",
		});
	});

	it("タイトルに改行が混ざっていても保存時に空白へ正規化する", async () => {
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.set("pageSlug", page.slug);
		formData.set("title", "Hello\nWorld");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>Updated content</p>");

		const result = await editPageContent({ data: formData });
		expect(result.success).toBe(true);

		const titleSegment = await db
			.selectFrom("segments")
			.select(["text"])
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();
		expect(titleSegment.text).toBe("Hello World");
	});

	it("認証されていないユーザーが保存するとログインへリダイレクトする", async () => {
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
		const formData = new FormData();
		formData.set("pageSlug", "test-page");
		formData.set("title", "Test Title");
		formData.set("userLocale", "en");
		formData.set("pageContent", "<p>Test content</p>");

		await expect(editPageContent({ data: formData })).rejects.toBeDefined();
	});
});
