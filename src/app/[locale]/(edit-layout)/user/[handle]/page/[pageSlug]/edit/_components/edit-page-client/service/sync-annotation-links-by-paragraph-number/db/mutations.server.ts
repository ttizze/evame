import type { PrismaClient } from "@prisma/client";

/**
 * Prismaのトランザクションクライアントの型
 */
type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * 既存のアノテーションリンクを削除する
 */
export async function deleteAnnotationLinks(
	tx: TransactionClient,
	annotationSegmentIds: number[],
): Promise<void> {
	await tx.segmentAnnotationLink.deleteMany({
		where: { annotationSegmentId: { in: annotationSegmentIds } },
	});
}

/**
 * アノテーションリンクを作成する
 */
export async function createAnnotationLinks(
	tx: TransactionClient,
	linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}>,
): Promise<void> {
	await tx.segmentAnnotationLink.createMany({
		data: linksToCreate,
		skipDuplicates: true,
	});
}
