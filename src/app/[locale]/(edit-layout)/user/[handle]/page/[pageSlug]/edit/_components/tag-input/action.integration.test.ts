import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth-server";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { editPageTagsAction } from "./action";

await setupDbPerFile(import.meta.url);

// 外部システムのみモック（認証とNext.jsのキャッシュ機能はvitest.setup.tsで共通モック済み）

describe("editPageTagsAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("無効な入力データが渡された場合、バリデーションエラーを返す", async () => {
		// Arrange: 実際のユーザーを作成し、認証をモック（セッション管理は外部システム）
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const invalidFormData = new FormData();
		invalidFormData.append("pageId", "1");
		// スペースを含む無効なタグ名
		invalidFormData.append("tags", JSON.stringify(["invalid tag with space"]));

		// Act
		const result = await editPageTagsAction(
			{ success: false },
			invalidFormData,
		);

		// Assert: バリデーションエラーが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("タグが5個を超える場合、バリデーションエラーを返す", async () => {
		// Arrange: 実際のユーザーを作成
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const invalidFormData = new FormData();
		invalidFormData.append("pageId", "1");
		// 6個のタグ（最大5個まで）
		invalidFormData.append(
			"tags",
			JSON.stringify(["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]),
		);

		// Act
		const result = await editPageTagsAction(
			{ success: false },
			invalidFormData,
		);

		// Assert: バリデーションエラーが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("認証されていないユーザーがアクセスした場合、リダイレクトされる", async () => {
		// Arrange: 認証されていない状態をモック
		vi.mocked(getCurrentUser).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("tags", JSON.stringify(["tag1"]));

		// Act & Assert: リダイレクトエラーが発生する
		await expect(
			editPageTagsAction({ success: false }, formData),
		).rejects.toThrow("NEXT_REDIRECT");
	});

	it("ページの所有者でないユーザーがアクセスした場合、リダイレクトされる", async () => {
		// Arrange: 実際のユーザーとページを作成（別のユーザーが所有）
		const pageOwner = await createUser();
		const otherUser = await createUser();
		const page = await createPage({
			userId: pageOwner.id,
			slug: "test-page",
		});

		// 別のユーザーで認証
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(otherUser));

		const formData = new FormData();
		formData.append("pageId", String(page.id));
		formData.append("tags", JSON.stringify(["tag1"]));

		// Act & Assert: リダイレクトエラーが発生する
		await expect(
			editPageTagsAction({ success: false }, formData),
		).rejects.toThrow("NEXT_REDIRECT");
	});

	it("有効な入力データでタグを更新した場合、タグが保存され成功レスポンスが返る", async () => {
		// Arrange: 実際のユーザーとページを作成
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "test-page",
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageId", String(page.id));
		formData.append("tags", JSON.stringify(["tag1", "tag2"]));

		// Act
		const result = await editPageTagsAction({ success: false }, formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);

		// Assert: タグがデータベースに保存されている（実際のDBで検証）
		const tagPagesResult = await db
			.selectFrom("tagPages")
			.innerJoin("tags", "tags.id", "tagPages.tagId")
			.select(["tags.id", "tags.name"])
			.where("tagPages.pageId", "=", page.id)
			.execute();
		expect(tagPagesResult).toHaveLength(2);
		const tagNames = tagPagesResult.map((tp) => tp.name).sort();
		expect(tagNames).toEqual(["tag1", "tag2"]);

		// Assert: キャッシュ再検証が呼ばれる
		expect(revalidatePath).toHaveBeenCalledWith(
			`/user/${user.handle}/page/${page.slug}/edit`,
		);
	});

	it("既存のタグを更新した場合、古いタグが削除され新しいタグが保存される", async () => {
		// Arrange: 実際のユーザーとページ、既存のタグを作成
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "test-page",
		});

		// 既存のタグを作成（upsertを使用してユニーク制約エラーを回避）
		const tagName = `oldtag${Date.now()}`;
		const existingTag = await db
			.insertInto("tags")
			.values({ name: tagName })
			.onConflict((oc) => oc.column("name").doUpdateSet({ name: tagName }))
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("tagPages")
			.values({
				tagId: existingTag.id,
				pageId: page.id,
			})
			.execute();

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageId", String(page.id));
		formData.append("tags", JSON.stringify(["newtag1", "newtag2"]));

		// Act
		const result = await editPageTagsAction({ success: false }, formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);

		// Assert: 古いタグが削除され、新しいタグが保存されている
		const tagPagesResult = await db
			.selectFrom("tagPages")
			.innerJoin("tags", "tags.id", "tagPages.tagId")
			.select(["tags.id", "tags.name"])
			.where("tagPages.pageId", "=", page.id)
			.execute();
		expect(tagPagesResult).toHaveLength(2);
		const tagNames = tagPagesResult.map((tp) => tp.name).sort();
		expect(tagNames).toEqual(["newtag1", "newtag2"]);
		expect(tagNames).not.toContain(existingTag.name);
	});

	it("重複するタグ名を送信した場合、重複が除去されて保存される", async () => {
		// Arrange: 実際のユーザーとページを作成
		const user = await createUser();
		const page = await createPage({
			userId: user.id,
			slug: "test-page",
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageId", String(page.id));
		// 重複するタグ名
		formData.append("tags", JSON.stringify(["tag1", "tag1", "tag2"]));

		// Act
		const result = await editPageTagsAction({ success: false }, formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);

		// Assert: 重複が除去されて保存されている
		const tagPagesResult = await db
			.selectFrom("tagPages")
			.innerJoin("tags", "tags.id", "tagPages.tagId")
			.select(["tags.id", "tags.name"])
			.where("tagPages.pageId", "=", page.id)
			.execute();
		expect(tagPagesResult).toHaveLength(2);
		const tagNames = tagPagesResult.map((tp) => tp.name).sort();
		expect(tagNames).toEqual(["tag1", "tag2"]);
	});
});
