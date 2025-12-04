import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { editPageContentAction } from "./action";

// 外部システムのみモック（認証とNext.jsのキャッシュ機能はvitest.setup.tsで共通モック済み）

describe("editPageContentAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("無効な入力データが渡された場合、バリデーションエラーを返す", async () => {
		// Arrange: 実際のユーザーを作成し、認証をモック（セッション管理は外部システム）
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const invalidFormData = new FormData();
		invalidFormData.append("pageSlug", "");
		invalidFormData.append("title", "");
		invalidFormData.append("userLocale", "en");
		invalidFormData.append("pageContent", "");

		// Act
		const result = await editPageContentAction(
			{ success: false },
			invalidFormData,
		);

		// Assert: バリデーションエラーが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("有効な入力データで既存ページを更新した場合、ページが保存され成功レスポンスが返る", async () => {
		// Arrange: 実際のユーザーとページを作成
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "test-page",
		});

		// 認証をモック（セッション管理は外部システム）
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", page.slug);
		formData.append("title", "Updated Title");
		formData.append("userLocale", "en");
		formData.append("pageContent", "<p>Updated content</p>");

		// Act
		const result = await editPageContentAction({ success: false }, formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);

		// Assert: データベースにページが保存されている（実際のDBで検証）
		const updatedPage = await prisma.page.findUnique({
			where: { id: page.id },
		});
		expect(updatedPage).toBeTruthy();
		expect(updatedPage?.slug).toBe(page.slug);

		// Assert: キャッシュ再検証が呼ばれる
		expect(revalidatePath).toHaveBeenCalledWith(
			`/${formData.get("userLocale")}/user/${user.handle}/page/${page.slug}`,
		);
	});

	it("認証されていないユーザーがアクセスした場合、リダイレクトされる", async () => {
		// Arrange: 認証されていない状態をモック
		vi.mocked(getCurrentUser).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageSlug", "test-page");
		formData.append("title", "Test Title");
		formData.append("userLocale", "en");
		formData.append("pageContent", "<p>Test content</p>");

		// Act & Assert: リダイレクトエラーが発生する
		await expect(
			editPageContentAction({ success: false }, formData),
		).rejects.toThrow("NEXT_REDIRECT");
	});
});
