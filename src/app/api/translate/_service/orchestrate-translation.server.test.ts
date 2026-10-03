import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getPageCommentSegmentsMock,
	getPageSegmentsMock,
	getPageTitleMock,
	markJobCompletedMock,
	markJobInProgressMock,
} = vi.hoisted(() => ({
	getPageCommentSegmentsMock: vi.fn(),
	getPageSegmentsMock: vi.fn(),
	getPageTitleMock: vi.fn(),
	markJobCompletedMock: vi.fn(),
	markJobInProgressMock: vi.fn(),
}));

vi.mock("../_db/queries.server", () => ({
	getPageCommentSegments: getPageCommentSegmentsMock,
	getPageSegments: getPageSegmentsMock,
	getPageTitle: getPageTitleMock,
}));
vi.mock("../_db/mutations.server", () => ({
	markJobCompleted: markJobCompletedMock,
	markJobInProgress: markJobInProgressMock,
}));
vi.mock("@/app/_service/logger.server", () => ({
	createServerLogger: () => ({ info: vi.fn() }),
}));

import { orchestrateTranslation } from "./orchestrate-translation.server";

describe("翻訳ジョブの対象segment選択", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getPageCommentSegmentsMock.mockResolvedValue([]);
		getPageTitleMock.mockResolvedValue("Page title");
	});

	it("pageCommentIdがある場合はページ本文ではなくコメントsegmentを取得する", async () => {
		await orchestrateTranslation({
			translationJobId: 1,
			aiModel: "gemini-2.5-flash-lite",
			userId: "user-id",
			pageId: 10,
			targetLocale: "ja",
			pageCommentId: 42,
			translationContext: "",
		});

		expect(getPageCommentSegmentsMock).toHaveBeenCalledWith(42);
		expect(getPageSegmentsMock).not.toHaveBeenCalled();
		expect(markJobCompletedMock).toHaveBeenCalledWith(1);
		expect(markJobInProgressMock).not.toHaveBeenCalled();
	});
});
