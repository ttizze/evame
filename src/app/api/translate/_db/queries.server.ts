import { prisma } from "@/lib/prisma";

const segmentSelect = {
	id: true,
	number: true,
	text: true,
} as const;

/** ページ本文のセグメントを取得（id, number, text） */
export async function getPageSegments(pageId: number) {
	return await prisma.segment.findMany({
		where: { content: { page: { id: pageId } } },
		select: segmentSelect,
	});
}

/** ページコメントのセグメントを取得（id, number, text） */
export async function getPageCommentSegments(pageCommentId: number) {
	return await prisma.segment.findMany({
		where: {
			content: { pageComment: { id: pageCommentId } },
		},
		select: segmentSelect,
	});
}

/** 注釈コンテンツのセグメントを取得（id, number, text） */
export async function getAnnotationSegments(contentId: number) {
	return await prisma.segment.findMany({
		where: { contentId },
		select: segmentSelect,
	});
}

/** ページタイトル（セグメント番号0のテキスト）を取得 */
export async function getPageTitle(pageId: number): Promise<string | null> {
	const segment = await prisma.segment.findFirst({
		where: {
			content: { page: { id: pageId } },
			number: 0,
		},
		select: { text: true },
	});
	return segment?.text ?? null;
}

export async function fetchGeminiApiKeyByUserId(
	userId: string,
): Promise<string | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		return null;
	}
	const geminiApiKey = await prisma.geminiApiKey.findUnique({
		where: { userId: user.id },
	});
	if (!geminiApiKey) {
		return null;
	}
	return geminiApiKey.apiKey;
}
