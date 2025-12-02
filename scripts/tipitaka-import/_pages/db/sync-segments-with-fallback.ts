import type { PrismaClient } from "@prisma/client";
import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import {
	syncSegmentMetadataAndLocators,
	syncSegments,
} from "@/app/[locale]/_lib/sync-segments";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

export async function syncSegmentsWithFallback(
	tx: TransactionClient,
	pageId: number,
	segments: SegmentDraft[],
	fallbackTitle: string,
	segmentTypeId: number,
) {
	let segmentsToSync = segments;

	if (segments.length === 0) {
		const fallbackHash = generateHashForText(fallbackTitle, 0);
		segmentsToSync = [
			{
				number: 0,
				text: fallbackTitle,
				textAndOccurrenceHash: fallbackHash,
				metadata: { items: [] },
			},
		];
	}

	const hashToSegmentId = await syncSegments(
		tx,
		pageId,
		segmentsToSync,
		segmentTypeId,
	);
	await syncSegmentMetadataAndLocators(tx, hashToSegmentId, segmentsToSync);
}
