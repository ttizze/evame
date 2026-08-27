import type {
	SqlExecutor,
	TranslationRow,
	TursoDatabase,
} from "../db/turso-types";
import {
	ForbiddenError,
	InvalidInputError,
	NotFoundError,
} from "../domain/errors";
import {
	parseNonEmptyText,
	parsePositiveId,
	parseSupportedLocale,
	parseTranslationInput,
	rankTranslations,
} from "../domain/vote";

export type TranslationCandidate = {
	id: number;
	segmentId: number;
	locale: string;
	text: string;
	point: number;
	createdAt: string;
	updatedAt: string;
	userId: string;
	source: "USER" | "AI";
	aiJobId: string | null;
	ownerUpvoted: boolean;
	votedByViewer: boolean | null;
	userName: string;
	userHandle: string;
	userProfile: string;
	userIsAi: boolean;
	userTotalPoints: number;
	ownedByViewer: boolean;
};

type ListTranslationsInput = {
	segmentId: number;
	locale: string;
	viewerUserId: string | null;
};

function parseListInput(input: unknown): ListTranslationsInput {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("翻訳検索条件が不正です");
	}
	const value = input as Record<string, unknown>;
	const viewerUserId = value.viewerUserId;
	if (
		viewerUserId !== undefined &&
		viewerUserId !== null &&
		(typeof viewerUserId !== "string" || viewerUserId.trim().length === 0)
	) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	return {
		segmentId: parsePositiveId(value.segmentId, "segmentId"),
		locale: parseSupportedLocale(value.locale),
		viewerUserId:
			viewerUserId === undefined || viewerUserId === null ? null : viewerUserId,
	};
}

function mapTranslation(row: TranslationRow): TranslationCandidate {
	if (
		!Number.isSafeInteger(row.id) ||
		!Number.isSafeInteger(row.segment_id) ||
		!Number.isSafeInteger(row.point)
	) {
		throw new InvalidInputError("翻訳行の数値が不正です");
	}
	if (row.source !== "USER" && row.source !== "AI") {
		throw new InvalidInputError("翻訳のsourceが不正です");
	}
	if (
		typeof row.user_name !== "string" ||
		typeof row.user_handle !== "string" ||
		typeof row.user_profile !== "string"
	) {
		throw new InvalidInputError("翻訳作者情報が不正です");
	}
	if (
		row.user_is_ai !== true &&
		row.user_is_ai !== false &&
		row.user_is_ai !== 0 &&
		row.user_is_ai !== 1
	) {
		throw new InvalidInputError("翻訳作者のAI状態が不正です");
	}
	if (!Number.isSafeInteger(row.user_total_points)) {
		throw new InvalidInputError("翻訳作者のポイントが不正です");
	}
	if (
		row.owner_upvoted !== true &&
		row.owner_upvoted !== false &&
		row.owner_upvoted !== 0 &&
		row.owner_upvoted !== 1
	) {
		throw new InvalidInputError("翻訳のowner vote状態が不正です");
	}
	if (
		row.owned_by_viewer !== true &&
		row.owned_by_viewer !== false &&
		row.owned_by_viewer !== 0 &&
		row.owned_by_viewer !== 1
	) {
		throw new InvalidInputError("翻訳の所有状態が不正です");
	}
	let votedByViewer: boolean | null = null;
	if (row.viewer_is_upvote !== undefined && row.viewer_is_upvote !== null) {
		if (row.viewer_is_upvote === true || row.viewer_is_upvote === 1) {
			votedByViewer = true;
		} else if (row.viewer_is_upvote === false || row.viewer_is_upvote === 0) {
			votedByViewer = false;
		} else {
			throw new InvalidInputError("翻訳のviewer vote状態が不正です");
		}
	}
	return {
		id: row.id,
		segmentId: row.segment_id,
		locale: row.locale,
		text: row.text,
		point: row.point,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		userId: row.user_id,
		source: row.source,
		aiJobId: row.ai_job_id,
		ownerUpvoted: row.owner_upvoted === true || row.owner_upvoted === 1,
		votedByViewer,
		userName: row.user_name,
		userHandle: row.user_handle,
		userProfile: row.user_profile,
		userIsAi: row.user_is_ai === true || row.user_is_ai === 1,
		userTotalPoints: row.user_total_points,
		ownedByViewer: row.owned_by_viewer === true || row.owned_by_viewer === 1,
	};
}

export async function listTranslationsForSegments(
	db: SqlExecutor,
	segmentIds: readonly number[],
	locale: string,
	viewerUserId: string | null,
): Promise<TranslationCandidate[]> {
	if (segmentIds.length === 0) return [];
	const placeholders = segmentIds.map(() => "?").join(", ");
	const rows = await db.all<TranslationRow>(
		`SELECT t.id, t.segment_id, t.locale, t.text, t.point, t.created_at,
				t.updated_at, t.user_id, t.source, t.ai_job_id,
				author.name AS user_name, author.handle AS user_handle,
				author.profile AS user_profile, author.is_ai AS user_is_ai,
				author.total_points AS user_total_points,
				CASE WHEN owner_vote.translation_id IS NULL THEN 0 ELSE 1 END AS owner_upvoted,
				viewer_vote.is_upvote AS viewer_is_upvote,
				CASE WHEN t.user_id = ? THEN 1 ELSE 0 END AS owned_by_viewer
		 FROM translations AS t
		 INNER JOIN segments AS s ON s.id = t.segment_id
		 INNER JOIN scriptures AS scripture ON scripture.id = s.scripture_id
		 INNER JOIN users AS author ON author.id = t.user_id
		 LEFT JOIN translation_votes AS owner_vote
			ON owner_vote.translation_id = t.id
			AND owner_vote.user_id = scripture.owner_user_id
			AND owner_vote.is_upvote = 1
		 LEFT JOIN translation_votes AS viewer_vote
			ON viewer_vote.translation_id = t.id
			AND viewer_vote.user_id = ?
		 WHERE t.segment_id IN (${placeholders})
			AND t.locale = ?
			AND scripture.published_at IS NOT NULL
		 ORDER BY t.segment_id, owner_upvoted DESC, t.point DESC,
			t.created_at DESC`,
		[viewerUserId, viewerUserId, ...segmentIds, locale],
	);
	return rows.map(mapTranslation);
}

export async function listTranslations(
	db: SqlExecutor,
	input: unknown,
): Promise<TranslationCandidate[]> {
	const { segmentId, locale, viewerUserId } = parseListInput(input);
	const segment = await db.get<{ id: number }>(
		`SELECT segments.id
		 FROM segments
		 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
		 WHERE segments.id = ? AND scriptures.published_at IS NOT NULL
		 LIMIT 1`,
		[segmentId],
	);
	if (!segment) throw new NotFoundError("セグメントが見つかりません");

	return rankTranslations(
		await listTranslationsForSegments(db, [segmentId], locale, viewerUserId),
	);
}

type AddTranslationInput = {
	segmentId: number;
	locale: string;
	text: string;
	userId: string;
};

function parseAddInput(input: unknown): AddTranslationInput {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("翻訳入力が不正です");
	}
	const value = input as Record<string, unknown>;
	if (typeof value.userId !== "string" || value.userId.trim().length === 0) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	const translation = parseTranslationInput(value);
	return {
		...translation,
		locale: parseSupportedLocale(translation.locale),
		userId: value.userId,
	};
}

function insertedId(value: number | bigint | string | undefined): number {
	const id = typeof value === "bigint" ? Number(value) : Number(value);
	if (!Number.isSafeInteger(id) || id <= 0) {
		throw new Error("翻訳IDを取得できませんでした");
	}
	return id;
}

export async function addTranslation(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationCandidate> {
	const request = parseAddInput(input);

	return db.transaction(async (transaction: SqlExecutor) => {
		const segment = await transaction.get<{ id: number }>(
			`SELECT segments.id
			 FROM segments
			 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
			 WHERE segments.id = ? AND scriptures.published_at IS NOT NULL
			 LIMIT 1`,
			[request.segmentId],
		);
		if (!segment) throw new NotFoundError("セグメントが見つかりません");

		const result = await transaction.run(
			`INSERT INTO translations
			 (segment_id, locale, text, point, user_id, source, ai_job_id)
			 VALUES (?, ?, ?, 0, ?, 'USER', NULL)`,
			[request.segmentId, request.locale, request.text, request.userId],
		);
		const id = insertedId(result.lastInsertRowid);
		const row = await transaction.get<TranslationRow>(
			`SELECT translations.id, translations.segment_id, translations.locale,
				translations.text, translations.point, translations.created_at,
				translations.updated_at, translations.user_id, translations.source,
				translations.ai_job_id,
				0 AS owner_upvoted, author.name AS user_name, author.handle AS user_handle,
				author.profile AS user_profile, author.is_ai AS user_is_ai,
				author.total_points AS user_total_points, 1 AS owned_by_viewer
			 FROM translations
			 INNER JOIN users AS author ON author.id = translations.user_id
			 WHERE translations.id = ? LIMIT 1`,
			[id],
		);
		if (!row) throw new Error("作成した翻訳を取得できませんでした");
		return mapTranslation(row);
	});
}

type AddAiTranslationInput = AddTranslationInput & { aiJobId: string };

function parseAiInput(input: unknown): AddAiTranslationInput {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("AI翻訳入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const request = parseAddInput(value);
	return {
		...request,
		aiJobId: parseNonEmptyText(value.aiJobId, "aiJobId"),
	};
}

export async function addAiTranslation(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationCandidate> {
	const request = parseAiInput(input);

	return db.transaction(async (transaction: SqlExecutor) => {
		const job = await transaction.get<{
			id: string;
			scripture_id: number | null;
			locale: string;
			requested_by: string | null;
		}>(
			`SELECT translation_jobs.id, translation_jobs.scripture_id,
				translation_jobs.locale, translation_jobs.requested_by
			 FROM translation_jobs
			 INNER JOIN scriptures
				ON scriptures.id = translation_jobs.scripture_id
			 WHERE translation_jobs.id = ?
				AND scriptures.published_at IS NOT NULL
			 LIMIT 1`,
			[request.aiJobId],
		);
		if (!job) throw new NotFoundError("翻訳ジョブが見つかりません");
		if (job.requested_by !== request.userId) {
			throw new ForbiddenError("この翻訳ジョブには書き込めません");
		}
		if (job.locale !== request.locale) {
			throw new InvalidInputError("AI翻訳のlocaleがジョブと一致しません");
		}

		const segment = await transaction.get<{ id: number; scripture_id: number }>(
			`SELECT segments.id, segments.scripture_id
			 FROM segments
			 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
			 WHERE segments.id = ? AND scriptures.published_at IS NOT NULL
			 LIMIT 1`,
			[request.segmentId],
		);
		if (!segment) throw new NotFoundError("セグメントが見つかりません");
		if (
			job.scripture_id !== null &&
			job.scripture_id !== segment.scripture_id
		) {
			throw new InvalidInputError("AI翻訳のセグメントがジョブと一致しません");
		}

		const result = await transaction.run(
			`INSERT INTO translations
			 (segment_id, locale, text, point, user_id, source, ai_job_id)
			 VALUES (?, ?, ?, 0, ?, 'AI', ?)`,
			[
				request.segmentId,
				request.locale,
				request.text,
				request.userId,
				request.aiJobId,
			],
		);
		const id = insertedId(result.lastInsertRowid);
		const row = await transaction.get<TranslationRow>(
			`SELECT translations.id, translations.segment_id, translations.locale,
				translations.text, translations.point, translations.created_at,
				translations.updated_at, translations.user_id, translations.source,
				translations.ai_job_id,
				0 AS owner_upvoted, author.name AS user_name, author.handle AS user_handle,
				author.profile AS user_profile, author.is_ai AS user_is_ai,
				author.total_points AS user_total_points, 1 AS owned_by_viewer
			 FROM translations
			 INNER JOIN users AS author ON author.id = translations.user_id
			 WHERE translations.id = ? LIMIT 1`,
			[id],
		);
		if (!row) throw new Error("作成した翻訳を取得できませんでした");
		return mapTranslation(row);
	});
}

export async function deleteTranslation(
	db: TursoDatabase,
	input: { translationId: unknown; userId: unknown },
): Promise<void> {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("削除入力が不正です");
	}
	if (typeof input.userId !== "string" || input.userId.trim().length === 0) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	const translationId = parsePositiveId(input.translationId, "translationId");
	const userId = input.userId;

	await db.transaction(async (transaction: SqlExecutor) => {
		const translation = await transaction.get<{ id: number; user_id: string }>(
			`SELECT translations.id, translations.user_id
			 FROM translations
			 INNER JOIN segments ON segments.id = translations.segment_id
			 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
			 WHERE translations.id = ? AND scriptures.published_at IS NOT NULL
			 LIMIT 1`,
			[translationId],
		);
		if (!translation) throw new NotFoundError("翻訳が見つかりません");
		if (translation.user_id !== userId) {
			throw new ForbiddenError("この翻訳を削除する権限がありません");
		}
		await transaction.run("DELETE FROM translations WHERE id = ?", [
			translationId,
		]);
	});
}
