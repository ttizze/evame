import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	contents,
	geminiApiKeys,
	pageComments,
	pages,
	segments,
	users,
} from "@/drizzle/schema";

/**
 * セグメントの選択フィールド（共通）
 */
const segmentSelect = {
	id: segments.id,
	number: segments.number,
	text: segments.text,
} as const;

/**
 * セグメントを取得する共通関数（id, number, text）
 * Drizzleに移行済み
 */
async function getSegments(where: SQL) {
	return await db.select(segmentSelect).from(segments).where(where);
}

/** ページ本文のセグメントを取得（id, number, text） */
/** Drizzleに移行済み */
export async function getPageSegments(pageId: number) {
	return await db
		.select(segmentSelect)
		.from(segments)
		.innerJoin(contents, eq(segments.contentId, contents.id))
		.innerJoin(pages, eq(contents.id, pages.id))
		.where(eq(pages.id, pageId));
}

/** ページコメントのセグメントを取得（id, number, text） */
/** Drizzleに移行済み */
export async function getPageCommentSegments(pageCommentId: number) {
	return await db
		.select(segmentSelect)
		.from(segments)
		.innerJoin(contents, eq(segments.contentId, contents.id))
		.innerJoin(pageComments, eq(contents.id, pageComments.id))
		.where(eq(pageComments.id, pageCommentId));
}

/** 注釈コンテンツのセグメントを取得（id, number, text） */
/** Drizzleに移行済み */
export async function getAnnotationSegments(contentId: number) {
	return getSegments(eq(segments.contentId, contentId));
}

/** ページタイトル（セグメント番号0のテキスト）を取得 */
/** Drizzleに移行済み */
export async function getPageTitle(pageId: number): Promise<string | null> {
	const result = await db
		.select({ text: segments.text })
		.from(segments)
		.innerJoin(contents, eq(segments.contentId, contents.id))
		.innerJoin(pages, eq(contents.id, pages.id))
		.where(and(eq(pages.id, pageId), eq(segments.number, 0)))
		.limit(1);
	return result[0]?.text ?? null;
}

/**
 * ユーザーIDからGemini APIキーを取得
 * Drizzleに移行済み
 */
export async function fetchGeminiApiKeyByUserId(
	userId: string,
): Promise<string | null> {
	const result = await db
		.select({ apiKey: geminiApiKeys.apiKey })
		.from(users)
		.innerJoin(geminiApiKeys, eq(users.id, geminiApiKeys.userId))
		.where(eq(users.id, userId))
		.limit(1);

	return result[0]?.apiKey ?? null;
}
