// action.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editPageStatusAction } from "./action";

/* ─────────────────────────────────────────────
   1. 依存モジュールをモック
   ──────────────────────────────────────────── */
vi.mock("@/app/[locale]/_action/auth-and-validate", () => ({
	authAndValidate: vi.fn(),
}));
vi.mock("@/app/[locale]/_db/queries.server", () => ({
	getPageById: vi.fn(),
}));
vi.mock("./_db/mutations.server", () => ({
	updatePageStatus: vi.fn(),
}));
vi.mock("@/app/[locale]/_lib/handle-auto-translation", () => ({
	handlePageAutoTranslation: vi.fn(),
}));
vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

import { revalidatePath } from "next/cache";
/* ─────────────────────────────────────────────
   2. モックの参照を取得
   ──────────────────────────────────────────── */
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { handlePageAutoTranslation } from "@/app/[locale]/_lib/auto-translation/handle-auto-translation";
import { updatePageStatus } from "./_db/mutations.server";

/* ─────────────────────────────────────────────
   3. 共通ダミー
   ──────────────────────────────────────────── */
const user = { id: "user1", handle: "user1" };
const page = {
	id: 1,
	userId: "user1",
	slug: "test-page",
	sourceLocale: "en",
};

const formData = (pageId: string, status: string) => {
	const fd = new FormData();
	fd.append("pageId", pageId);
	fd.append("status", status);
	return fd;
};

describe("editPageStatusAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GEMINI_API_KEY = "test-key";
	});

	it("returns validation error when authAndValidate fails", async () => {
		vi.mocked(authAndValidate).mockResolvedValue({
			success: false,
			zodErrors: { pageId: ["Required"] },

			//biome-ignore lint/suspicious/noExplicitAny: <>
		} as any);

		const result = await editPageStatusAction(
			{ success: false },
			formData("", ""),
		);

		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("updates a PUBLIC page and triggers translation", async () => {
		vi.mocked(authAndValidate).mockResolvedValue({
			success: true,
			currentUser: user,
			data: { pageId: 1, status: "PUBLIC" },

			//biome-ignore lint/suspicious/noExplicitAny: <>
		} as any);
		//biome-ignore lint/suspicious/noExplicitAny: <>
		vi.mocked(getPageById).mockResolvedValue(page as any);
		vi.mocked(handlePageAutoTranslation).mockResolvedValue([
			{ jobId: 123, locale: "ja", jobStatus: "PENDING" },

			//biome-ignore lint/suspicious/noExplicitAny: <>
		] as any);

		const res = await editPageStatusAction(
			{ success: false },
			formData("1", "PUBLIC"),
		);

		expect(res.success).toBe(true);
		expect(res.success && res.data).toBeDefined();
		expect(res.success && res.data?.translationJobs).toHaveLength(1);
		expect(updatePageStatus).toHaveBeenCalledWith(1, "PUBLIC");
		expect(handlePageAutoTranslation).toHaveBeenCalled();
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/user1/page/test-page/edit",
		);
	});

	it("skips translation for non-PUBLIC status", async () => {
		vi.mocked(authAndValidate).mockResolvedValue({
			success: true,
			currentUser: user,
			data: { pageId: 1, status: "DRAFT" },

			//biome-ignore lint/suspicious/noExplicitAny: <>
		} as any);
		//biome-ignore lint/suspicious/noExplicitAny: <>
		vi.mocked(getPageById).mockResolvedValue(page as any);

		const res = await editPageStatusAction(
			{ success: false },
			formData("1", "DRAFT"),
		);

		expect(res.success).toBe(true);
		expect(res.success && res.data?.translationJobs).toBeUndefined();
		expect(handlePageAutoTranslation).not.toHaveBeenCalled();
	});
});
