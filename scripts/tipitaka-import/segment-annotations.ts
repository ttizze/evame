import type { PrismaClient } from "@prisma/client";

/**
 * 段落番号のパターン: 数字にドット（例: "123." または "123\."）
 * エスケープされたドット（\.）にも対応
 */
const PARAGRAPH_NUMBER_REGEX = /(\d+)(?:\.|\\.)/g;

/**
 * セグメントのテキストから最初の段落番号を抽出する
 */
function extractFirstParagraphNumber(text: string): string | null {
	PARAGRAPH_NUMBER_REGEX.lastIndex = 0;
	const match = PARAGRAPH_NUMBER_REGEX.exec(text);
	if (match?.[1]) {
		return match[1];
	}
	return null;
}

/**
 * 段落番号 → セグメントID配列のマッピング
 */
export type ParagraphSegmentMap = Map<string, number[]>;

/**
 * 段落番号 → アンカーセグメントIDのマッピング
 * （各段落番号について、最大ナンバーのセグメントID）
 */
export type ParagraphAnchorMap = Map<string, number>;

/**
 * コンテンツ内のセグメントを段落番号でグループ化する
 *
 * セグメントのテキストから段落番号を抽出し、
 * その段落番号が出現してから次の段落番号が出現するまでの
 * すべてのセグメントを同じグループに分類する。
 *
 * @param prisma Prismaクライアント
 * @param contentId コンテンツID
 * @returns 段落番号 → セグメントID配列のマッピング
 */
export async function buildParagraphSegmentMap(
	prisma: PrismaClient,
	contentId: number,
): Promise<ParagraphSegmentMap> {
	const segments = await prisma.segment.findMany({
		where: { contentId },
		orderBy: { number: "asc" },
		select: { id: true, number: true, text: true },
	});

	// セグメントID → 段落番号のマッピングを作成
	const paragraphNumberBySegmentId = new Map<number, string>();
	for (const segment of segments) {
		const paragraphNumber = extractFirstParagraphNumber(segment.text);
		if (paragraphNumber) {
			paragraphNumberBySegmentId.set(segment.id, paragraphNumber);
		}
	}

	const paragraphNumberToSegmentIds: ParagraphSegmentMap = new Map();
	let currentParagraphNumber: string | null = null;

	// セグメントを順番に処理し、段落番号でグループ化
	// 段落番号が出現したらそれを現在の段落番号として保持し、
	// 次の段落番号が出現するまで同じグループに分類する
	for (const segment of segments) {
		const paragraphNumber = paragraphNumberBySegmentId.get(segment.id) ?? null;
		if (paragraphNumber) {
			currentParagraphNumber = paragraphNumber;
		}
		if (!currentParagraphNumber) continue;

		const segmentIds =
			paragraphNumberToSegmentIds.get(currentParagraphNumber) ?? [];
		segmentIds.push(segment.id);
		paragraphNumberToSegmentIds.set(currentParagraphNumber, segmentIds);
	}

	return paragraphNumberToSegmentIds;
}

/**
 * 各段落番号について、最大ナンバーのセグメント（アンカーセグメント）を特定する
 *
 * @param prisma Prismaクライアント
 * @param paragraphNumberToSegmentIds 段落番号 → セグメントID配列のマッピング
 * @returns 段落番号 → アンカーセグメントIDのマッピング
 */
export async function buildParagraphAnchorMap(
	prisma: PrismaClient,
	paragraphNumberToSegmentIds: ParagraphSegmentMap,
): Promise<ParagraphAnchorMap> {
	const anchorMap: ParagraphAnchorMap = new Map();

	for (const [paragraphNumber, segmentIds] of paragraphNumberToSegmentIds) {
		if (segmentIds.length === 0) continue;

		// セグメントのナンバーを取得
		const segments = await prisma.segment.findMany({
			where: { id: { in: segmentIds } },
			select: { id: true, number: true },
		});

		// 最大ナンバーのセグメントをアンカーとして選択
		const anchorSegment = segments.reduce((max, seg) =>
			seg.number > max.number ? seg : max,
		);

		anchorMap.set(paragraphNumber, anchorSegment.id);
	}

	return anchorMap;
}

/**
 * 注釈セグメントを本文セグメントに直接リンクする
 *
 * @param prisma Prismaクライアント
 * @param annotationSegmentIds 注釈セグメントID配列
 * @param mainSegmentId 本文セグメントID（アンカー）
 */
export async function linkAnnotationSegments(
	prisma: PrismaClient,
	annotationSegmentIds: number[],
	mainSegmentId: number,
): Promise<void> {
	if (annotationSegmentIds.length === 0) return;

	const linkData = annotationSegmentIds.map((annotationSegmentId) => ({
		mainSegmentId,
		annotationSegmentId,
	}));

	await prisma.segmentAnnotationLink.createMany({
		data: linkData,
		skipDuplicates: true,
	});
}
