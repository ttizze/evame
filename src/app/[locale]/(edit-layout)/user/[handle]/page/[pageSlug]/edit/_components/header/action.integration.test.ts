import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
import { mockCurrentUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { editPageStatusAction } from "./action";
import { enqueuePageTranslation } from "./service/enqueue-page-translation.server";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// 共有依存のみモック
vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));
// 外部翻訳API呼び出しをモック
vi.mock(
	"@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/header/service/enqueue-page-translation.server",
	() => ({
		enqueuePageTranslation: vi.fn(),
	}),
);
vi.mock("@/lib/revalidate-utils", () => ({
	revalidateAllLocales: vi.fn(),
}));

describe("editPageStatusAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	describe("認証チェック", () => {
		it("未認証の場合、ログインページにリダイレクトする", async () => {
			mockCurrentUser(null);
			const formData = new FormData();
			formData.append("pageId", "1");
			formData.append("status", "PUBLIC");

			await expect(
				editPageStatusAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);
			expect(redirect).toHaveBeenCalledWith("/auth/login");
		});
	});

	describe("バリデーション", () => {
		it("pageIdが指定されていない場合、バリデーションエラーを返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);
			const formData = new FormData();
			formData.append("status", "PUBLIC");

			const result = await editPageStatusAction({ success: false }, formData);

			expect(result.success).toBe(false);
			expect(!result.success && result.zodErrors?.pageId).toBeDefined();
		});

		it("不正なstatusの場合、バリデーションエラーを返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);
			const formData = new FormData();
			formData.append("pageId", "1");
			formData.append("status", "INVALID");

			const result = await editPageStatusAction({ success: false }, formData);

			expect(result.success).toBe(false);
			expect(!result.success && result.zodErrors?.status).toBeDefined();
		});
	});

	describe("権限チェック", () => {
		it("他のユーザーのページは編集できない", async () => {
			const owner = await createUser();
			const otherUser = await createUser();
			const page = await createPage({
				userId: owner.id,
				slug: "test-page",
				status: "DRAFT",
			});
			mockCurrentUser(otherUser);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());
			formData.append("status", "PUBLIC");

			await expect(
				editPageStatusAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);
			expect(redirect).toHaveBeenCalledWith("/auth/login");
		});
	});

	describe("ステータス更新", () => {
		it("DRAFTをPUBLICに変更し、翻訳ジョブを作成する", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({
				userId: user.id,
				slug: "test-page",
				status: "DRAFT",
			});
			mockCurrentUser(user);
			vi.mocked(enqueuePageTranslation).mockResolvedValue([
				{
					id: 1,
					locale: "ja",
					aiModel: "gemini-2.0-flash",
					status: "PENDING",
					progress: 0,
					error: "",
					pageId: page.id,
					page: { slug: page.slug, user: { handle: user.handle } },
				},
			]);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());
			formData.append("status", "PUBLIC");
			formData.append("targetLocales", "ja,zh");

			const result = await editPageStatusAction({ success: false }, formData);

			expect(result.success).toBe(true);
			expect(result.success && result.data?.translationJobs).toHaveLength(1);

			const updatedPage = await db
				.selectFrom("pages")
				.selectAll()
				.where("id", "=", page.id)
				.executeTakeFirst();
			expect(updatedPage?.status).toBe("PUBLIC");

			expect(enqueuePageTranslation).toHaveBeenCalledWith({
				aiModel: "gemini-2.5-flash-lite",
				currentUserId: user.id,
				pageId: page.id,
				targetLocales: ["ja", "zh"],
			});

			expect(revalidateAllLocales).toHaveBeenCalledWith(
				`/user/testuser/page/test-page`,
			);
		});

		it("非PUBLICステータスの場合、翻訳ジョブは作成されない", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({
				userId: user.id,
				slug: "test-page",
				status: "PUBLIC",
			});
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());
			formData.append("status", "DRAFT");

			const result = await editPageStatusAction({ success: false }, formData);

			expect(result.success).toBe(true);
			expect(result.success && result.data).toBeUndefined();
			expect(enqueuePageTranslation).not.toHaveBeenCalled();

			const updatedPage = await db
				.selectFrom("pages")
				.selectAll()
				.where("id", "=", page.id)
				.executeTakeFirst();
			expect(updatedPage?.status).toBe("DRAFT");
		});

		it("targetLocalesが空の場合も正常に処理される", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({
				userId: user.id,
				slug: "test-page",
				status: "DRAFT",
			});
			mockCurrentUser(user);
			vi.mocked(enqueuePageTranslation).mockResolvedValue([]);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());
			formData.append("status", "PUBLIC");
			formData.append("targetLocales", "");

			const result = await editPageStatusAction({ success: false }, formData);

			expect(result.success).toBe(true);
			expect(enqueuePageTranslation).toHaveBeenCalledWith({
				aiModel: "gemini-2.5-flash-lite",
				currentUserId: user.id,
				pageId: page.id,
				targetLocales: ["en", "zh"],
			});
		});

		it("targetLocalesが未指定の場合、デフォルトロケールで翻訳ジョブを作成する", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({
				userId: user.id,
				slug: "test-page",
				status: "DRAFT",
			});
			mockCurrentUser(user);
			vi.mocked(enqueuePageTranslation).mockResolvedValue([]);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());
			formData.append("status", "PUBLIC");

			const result = await editPageStatusAction({ success: false }, formData);

			expect(result.success).toBe(true);
			expect(enqueuePageTranslation).toHaveBeenCalledWith({
				aiModel: "gemini-2.5-flash-lite",
				currentUserId: user.id,
				pageId: page.id,
				targetLocales: ["en", "zh"],
			});
		});
	});
});
