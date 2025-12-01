import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { syncSegmentsWithFallback } from "./helpers";

const syncSegmentsMock = vi.fn();
const syncSegmentMetadataAndLocatorsMock = vi.fn();

// syncSegmentsとsyncSegmentMetadataAndLocatorsをモック
vi.mock("@/app/[locale]/_lib/sync-segments", () => ({
	syncSegments: (...args: unknown[]) => syncSegmentsMock(...args),
	syncSegmentMetadataAndLocators: (...args: unknown[]) =>
		syncSegmentMetadataAndLocatorsMock(...args),
}));

describe("syncSegmentsWithFallback", () => {
	const mockTx = {} as any;
	const pageId = 1;
	const segmentTypeId = 1;
	const fallbackTitle = "Test Title";

	beforeEach(() => {
		vi.clearAllMocks();
		syncSegmentsMock.mockReset();
		syncSegmentMetadataAndLocatorsMock.mockReset();
	});

	it("segmentsが空の場合、number=0のフォールバックセグメントを作成する", async () => {
		const mockHashToSegmentId = new Map<string, number>();
		syncSegmentsMock.mockResolvedValue(mockHashToSegmentId);

		await syncSegmentsWithFallback(
			mockTx,
			pageId,
			[],
			fallbackTitle,
			segmentTypeId,
		);

		expect(syncSegmentsMock).toHaveBeenCalledWith(
			mockTx,
			pageId,
			[
				{
					number: 0,
					text: fallbackTitle,
					textAndOccurrenceHash: generateHashForText(fallbackTitle, 0),
					metadata: { items: [] },
				},
			],
			segmentTypeId,
		);
	});

	it("segmentsにnumber=0が含まれている場合、そのまま使用する", async () => {
		const existingHash = generateHashForText("Existing Title", 0);
		const segments: SegmentDraft[] = [
			{
				number: 0,
				text: "Existing Title",
				textAndOccurrenceHash: existingHash,
			},
			{
				number: 1,
				text: "Body text",
				textAndOccurrenceHash: generateHashForText("Body text", 0),
			},
		];

		const mockHashToSegmentId = new Map<string, number>([[existingHash, 1]]);
		syncSegmentsMock.mockResolvedValue(mockHashToSegmentId);

		await syncSegmentsWithFallback(
			mockTx,
			pageId,
			segments,
			fallbackTitle,
			segmentTypeId,
		);

		expect(syncSegmentsMock).toHaveBeenCalledWith(
			mockTx,
			pageId,
			segments,
			segmentTypeId,
		);
	});

	it("segmentsにnumber=0が含まれていない場合、number=0のセグメントを追加する", async () => {
		const segments: SegmentDraft[] = [
			{
				number: 1,
				text: "Body text 1",
				textAndOccurrenceHash: generateHashForText("Body text 1", 0),
			},
			{
				number: 2,
				text: "Body text 2",
				textAndOccurrenceHash: generateHashForText("Body text 2", 0),
			},
		];

		const fallbackHash = generateHashForText(fallbackTitle, 0);
		const mockHashToSegmentId = new Map<string, number>([[fallbackHash, 1]]);
		syncSegmentsMock.mockResolvedValue(mockHashToSegmentId);

		await syncSegmentsWithFallback(
			mockTx,
			pageId,
			segments,
			fallbackTitle,
			segmentTypeId,
		);

		expect(syncSegmentsMock).toHaveBeenCalledWith(
			mockTx,
			pageId,
			[
				{
					number: 0,
					text: fallbackTitle,
					textAndOccurrenceHash: fallbackHash,
					metadata: { items: [] },
				},
				...segments,
			],
			segmentTypeId,
		);
	});

	it("segmentsにnumber=0が含まれていない場合でも、syncSegmentMetadataAndLocatorsが正しく呼ばれる", async () => {
		const segments: SegmentDraft[] = [
			{
				number: 1,
				text: "Body text",
				textAndOccurrenceHash: generateHashForText("Body text", 0),
			},
		];

		const fallbackHash = generateHashForText(fallbackTitle, 0);
		const mockHashToSegmentId = new Map<string, number>([[fallbackHash, 1]]);
		syncSegmentsMock.mockResolvedValue(mockHashToSegmentId);

		await syncSegmentsWithFallback(
			mockTx,
			pageId,
			segments,
			fallbackTitle,
			segmentTypeId,
		);

		expect(syncSegmentMetadataAndLocatorsMock).toHaveBeenCalledWith(
			mockTx,
			mockHashToSegmentId,
			[
				{
					number: 0,
					text: fallbackTitle,
					textAndOccurrenceHash: fallbackHash,
					metadata: { items: [] },
				},
				...segments,
			],
		);
	});
});
