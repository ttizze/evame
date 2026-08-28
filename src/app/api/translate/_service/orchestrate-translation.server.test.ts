import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getContentSegmentsMock,
	getPageSegmentsMock,
	getPageTitleMock,
	markJobCompletedMock,
	markJobInProgressMock,
} = vi.hoisted(() => ({
	getContentSegmentsMock: vi.fn(),
	getPageSegmentsMock: vi.fn(),
	getPageTitleMock: vi.fn(),
	markJobCompletedMock: vi.fn(),
	markJobInProgressMock: vi.fn(),
}));

vi.mock("../_db/queries.server", () => ({
	getContentSegments: getContentSegmentsMock,
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
		getContentSegmentsMock.mockResolvedValue([]);
		getPageTitleMock.mockResolvedValue("Page title");
	});

	it("pageCommentIdがある場合はページ本文ではなくコメントsegmentを取得する", async () => {
		await orchestrateTranslation({
			translationJobId: 1,
			aiModel: "gemini-2.5-flash-lite",
			userId: "user-id",
			pageId: 10,
			targetLocale: "ja",
			annotationContentId: null,
			pageCommentId: 42,
			translationContext: "",
		});

		expect(getContentSegmentsMock).toHaveBeenCalledWith(42, "PAGE_COMMENT");
		expect(getPageSegmentsMock).not.toHaveBeenCalled();
		expect(markJobCompletedMock).toHaveBeenCalledWith(1);
		expect(markJobInProgressMock).not.toHaveBeenCalled();
	});
});
