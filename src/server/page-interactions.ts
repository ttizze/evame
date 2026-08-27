import type { SqlExecutor, TursoDatabase } from "../db/turso-types";
import { InvalidInputError, NotFoundError } from "../domain/errors";
import { parsePositiveId } from "../domain/vote";

export type PageInteractionState = {
	liked: boolean;
	likeCount: number;
	viewCount: number;
};

type PageLikeRequest = {
	pageId: number;
	userId: string;
};

function readCount(value: unknown, fieldName: string): number {
	const count = typeof value === "bigint" ? Number(value) : value;
	if (!Number.isSafeInteger(count) || (count as number) < 0) {
		throw new InvalidInputError(`${fieldName} が不正です`);
	}
	return count as number;
}

function parseUserId(value: unknown): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	return value;
}

function parsePageId(value: unknown): number {
	return parsePositiveId(value, "pageId");
}

function parsePageLikeRequest(input: unknown): PageLikeRequest {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("ページいいね入力が不正です");
	}
	const value = input as Record<string, unknown>;
	return {
		pageId: parsePageId(value.pageId),
		userId: parseUserId(value.userId),
	};
}

async function requirePublishedPage(
	db: SqlExecutor,
	pageId: number,
): Promise<void> {
	const page = await db.get<{ id: number }>(
		`SELECT id
		 FROM scriptures
		 WHERE id = ? AND published_at IS NOT NULL
		 LIMIT 1`,
		[pageId],
	);
	if (!page) throw new NotFoundError("公開ページが見つかりません");
}

export async function readPageInteractionState(
	db: SqlExecutor,
	input: unknown,
): Promise<PageInteractionState> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("ページ状態の入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const pageId = parsePageId(value.pageId);
	const viewerUserId =
		value.viewerUserId === undefined || value.viewerUserId === null
			? null
			: parseUserId(value.viewerUserId);

	await requirePublishedPage(db, pageId);

	const likeCountRow = await db.get<{ count: number | bigint }>(
		"SELECT COUNT(*) AS count FROM like_pages WHERE page_id = ?",
		[pageId],
	);
	const viewCountRow = await db.get<{ count: number | bigint }>(
		"SELECT count FROM page_views WHERE page_id = ? LIMIT 1",
		[pageId],
	);
	const likedRow = viewerUserId
		? await db.get<{ liked: number | boolean }>(
				"SELECT 1 AS liked FROM like_pages WHERE page_id = ? AND user_id = ? LIMIT 1",
				[pageId, viewerUserId],
			)
		: undefined;

	return {
		liked: Boolean(likedRow),
		likeCount: readCount(likeCountRow?.count ?? 0, "likeCount"),
		viewCount: readCount(viewCountRow?.count ?? 0, "viewCount"),
	};
}

export async function fetchPageViewCount(
	db: SqlExecutor,
	pageId: unknown,
): Promise<number> {
	const parsedPageId = parsePageId(pageId);
	await requirePublishedPage(db, parsedPageId);
	const row = await db.get<{ count: number | bigint }>(
		"SELECT count FROM page_views WHERE page_id = ? LIMIT 1",
		[parsedPageId],
	);
	return readCount(row?.count ?? 0, "viewCount");
}

export async function incrementPageView(
	db: TursoDatabase,
	pageId: unknown,
): Promise<number> {
	const parsedPageId = parsePageId(pageId);
	return db.transaction(async (transaction) => {
		await requirePublishedPage(transaction, parsedPageId);
		await transaction.run(
			`INSERT INTO page_views (page_id, count)
			 VALUES (?, 1)
			 ON CONFLICT (page_id) DO UPDATE SET count = page_views.count + 1`,
			[parsedPageId],
		);
		const row = await transaction.get<{ count: number | bigint }>(
			"SELECT count FROM page_views WHERE page_id = ? LIMIT 1",
			[parsedPageId],
		);
		return readCount(row?.count ?? 0, "viewCount");
	});
}

export async function togglePageLike(
	db: TursoDatabase,
	input: unknown,
): Promise<Pick<PageInteractionState, "liked" | "likeCount">> {
	const request = parsePageLikeRequest(input);
	return db.transaction(async (transaction) => {
		await requirePublishedPage(transaction, request.pageId);
		const existing = await transaction.get<{ id: number }>(
			"SELECT id FROM like_pages WHERE page_id = ? AND user_id = ? LIMIT 1",
			[request.pageId, request.userId],
		);

		if (existing) {
			await transaction.run("DELETE FROM like_pages WHERE id = ?", [
				existing.id,
			]);
		} else {
			await transaction.run(
				"INSERT INTO like_pages (page_id, user_id) VALUES (?, ?)",
				[request.pageId, request.userId],
			);
		}

		const countRow = await transaction.get<{ count: number | bigint }>(
			"SELECT COUNT(*) AS count FROM like_pages WHERE page_id = ?",
			[request.pageId],
		);
		return {
			liked: !existing,
			likeCount: readCount(countRow?.count ?? 0, "likeCount"),
		};
	});
}
