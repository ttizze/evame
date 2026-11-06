import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPageDetail } from "./load-page-detail";

const { query, user, content } = vi.hoisted(() => ({
	query: vi.fn(),
	user: vi.fn(),
	content: vi.fn(),
}));
vi.mock("@/app/[locale]/_db/queries", () => ({ queryPageDetail: query }));
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: user,
}));
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data",
	() => ({ loadPageContentData: content }),
);

beforeEach(() => {
	query.mockReset().mockResolvedValue({
		status: "DRAFT",
		userHandle: "owner",
		segments: [{ number: 0 }],
	});
	user.mockReset().mockResolvedValue({ handle: "owner" });
	content.mockReset().mockResolvedValue({ pageDetail: {} });
});

describe("記事表示の権限", () => {
	it("所有者は下書きのプレビューを読める", async () => {
		const headers = new Headers({ cookie: "test-session" });
		expect(await loadPageDetail("ja", "owner", "draft", headers)).toEqual({
			pageDetail: {},
		});
		expect(user).toHaveBeenCalledWith(headers);
	});
	it.each([null, { handle: "other" }])(
		"所有者以外には非公開本文を渡さない",
		async (viewer) => {
			user.mockResolvedValue(viewer);
			expect(
				await loadPageDetail("ja", "owner", "draft", new Headers()),
			).toBeNull();
			expect(content).not.toHaveBeenCalled();
		},
	);
	it("公開記事では認証を待たずに本文を取得する", async () => {
		query.mockResolvedValue({
			status: "PUBLIC",
			userHandle: "owner",
			segments: [{ number: 0 }],
		});
		expect(
			await loadPageDetail("ja", "owner", "public", new Headers()),
		).toEqual({ pageDetail: {} });
		expect(user).not.toHaveBeenCalled();
	});
	it("URLの著者が違う記事は表示しない", async () => {
		expect(
			await loadPageDetail("ja", "other", "draft", new Headers()),
		).toBeNull();
		expect(content).not.toHaveBeenCalled();
	});
	it("タイトルのない記事は表示しない", async () => {
		query.mockResolvedValue({
			status: "PUBLIC",
			userHandle: "owner",
			segments: [],
		});
		expect(
			await loadPageDetail("ja", "owner", "empty", new Headers()),
		).toBeNull();
	});
});
