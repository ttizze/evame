import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { togglePageLike } from "./mutations.server";

await setupDbPerFile(import.meta.url);

describe("togglePageLike", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ユーザーがページにいいねをしていない場合、いいねを追加してliked:trueとlikeCount:1を返す", async () => {
		// Arrange: テストに必要な最小限のデータのみ作成
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });

		// Act
		const result = await togglePageLike(page.id, user.id);

		// Assert: 戻り値を確認
		expect(result).toStrictEqual({ liked: true, likeCount: 1 });

		// Assert: データベースの状態を確認
		const likeEntry = await db
			.selectFrom("likePages")
			.selectAll()
			.where("pageId", "=", page.id)
			.where("userId", "=", user.id)
			.execute();
		expect(likeEntry.length).toBe(1);
	});

	it("ユーザーが既にページにいいねしている場合、いいねを削除してliked:falseとlikeCount:0を返す", async () => {
		// Arrange: いいね済みの状態を作成
		const user = await createUser();
		const page = await createPage({ userId: user.id, slug: "test-page" });
		await togglePageLike(page.id, user.id);

		// Act: 再度いいねをトグル
		const result = await togglePageLike(page.id, user.id);

		// Assert: 戻り値を確認
		expect(result).toStrictEqual({ liked: false, likeCount: 0 });

		// Assert: データベースからいいねが削除されていることを確認
		const remaining = await db
			.selectFrom("likePages")
			.selectAll()
			.where("pageId", "=", page.id)
			.where("userId", "=", user.id)
			.execute();
		expect(remaining.length).toBe(0);
	});

	it("存在しないページIDを指定した場合、エラーを投げる", async () => {
		// Arrange
		const user = await createUser();
		const nonExistentPageId = 999999;

		// Act & Assert
		await expect(togglePageLike(nonExistentPageId, user.id)).rejects.toThrow(
			"Page not found",
		);
	});
});
