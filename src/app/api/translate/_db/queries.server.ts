import { db } from "@/db";

/** ページ本文のセグメントを取得（id, number, text） */
/** Kyselyに移行済み */
export async function getPageSegments(pageId: number) {
	return await db
		.selectFrom("segments")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.innerJoin("pages", "contents.id", "pages.id")
		.select(["segments.id", "segments.number", "segments.text"])
		.where("pages.id", "=", pageId)
		.execute();
}

/** ページコメントのセグメントを取得（id, number, text） */
/** Kyselyに移行済み */
export async function getPageCommentSegments(pageCommentId: number) {
	return await db
		.selectFrom("segments")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.innerJoin("pageComments", "contents.id", "pageComments.id")
		.select(["segments.id", "segments.number", "segments.text"])
		.where("pageComments.id", "=", pageCommentId)
		.execute();
}

/** 注釈コンテンツのセグメントを取得（id, number, text） */
/** Kyselyに移行済み */
export async function getAnnotationSegments(contentId: number) {
	return await db
		.selectFrom("segments")
		.select(["id", "number", "text"])
		.where("contentId", "=", contentId)
		.execute();
}

/** ページタイトル（セグメント番号0のテキスト）を取得 */
/** Kyselyに移行済み */
export async function getPageTitle(pageId: number): Promise<string | null> {
	const result = await db
		.selectFrom("segments")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.innerJoin("pages", "contents.id", "pages.id")
		.select("segments.text")
		.where("pages.id", "=", pageId)
		.where("segments.number", "=", 0)
		.executeTakeFirst();
	return result?.text ?? null;
}

/**
 * ユーザーIDからGemini APIキーを取得
 * Kyselyに移行済み
 */
export async function fetchGeminiApiKeyByUserId(
	userId: string,
): Promise<string | null> {
	const result = await db
		.selectFrom("users")
		.innerJoin("geminiApiKeys", "users.id", "geminiApiKeys.userId")
		.select("geminiApiKeys.apiKey")
		.where("users.id", "=", userId)
		.executeTakeFirst();

	return result?.apiKey ?? null;
}
