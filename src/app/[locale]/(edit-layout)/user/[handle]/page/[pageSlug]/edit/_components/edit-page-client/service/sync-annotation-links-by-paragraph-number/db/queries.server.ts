import type { PrismaClient } from "@prisma/client";

/**
 * Prismaのトランザクションクライアントの型
 */
type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * コンテンツのセグメントタイプを取得する
 */
export async function fetchSegmentTypeKey(
	tx: TransactionClient,
	contentId: number,
): Promise<string | undefined> {
	const currentSegmentType = await tx.segment.findFirst({
		where: { contentId },
		select: { segmentType: { select: { key: true } } },
	});

	return currentSegmentType?.segmentType.key;
}

/**
 * 親ページのPRIMARYセグメントを取得（メタデータも取得して段落番号を取得）
 */
export async function fetchPrimarySegmentsWithParagraphNumbers(
	tx: TransactionClient,
	anchorContentId: number,
): Promise<
	Array<{
		id: number;
		number: number;
		metadata: Array<{ value: string }>;
	}>
> {
	return await tx.segment.findMany({
		where: {
			contentId: anchorContentId,
		},
		select: {
			id: true,
			number: true,
			metadata: {
				where: {
					metadataType: {
						key: "PARAGRAPH_NUMBER",
					},
				},
				select: {
					value: true,
				},
			},
		},
		orderBy: { number: "asc" },
	});
}
