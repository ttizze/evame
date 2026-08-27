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
import {
	getSessionUser,
	hashSessionToken,
	requireSessionUserInTransaction,
} from "./session";

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
};

type ListTranslationsInput = {
	segmentId: number;
	locale: string;
	sessionToken?: string | null;
};

async function readViewerId(
	db: SqlExecutor,
	sessionToken: unknown,
): Promise<string | null> {
	if (sessionToken === undefined || sessionToken === null) return null;
	if (typeof sessionToken !== "string" || sessionToken.trim().length === 0) {
		throw new InvalidInputError("セッショントークンが不正です");
	}
	const user = await getSessionUser(db, sessionToken);
	return user?.id ?? null;
}

function parseListInput(input: unknown): ListTranslationsInput {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("翻訳検索条件が不正です");
	}
	const value = input as Record<string, unknown>;
	const sessionToken = value.sessionToken;
	if (
		sessionToken !== undefined &&
		sessionToken !== null &&
		typeof sessionToken !== "string"
	) {
		throw new InvalidInputError("セッショントークンが不正です");
	}
	return {
		segmentId: parsePositiveId(value.segmentId, "segmentId"),
		locale: parseSupportedLocale(value.locale),
		sessionToken:
			sessionToken === undefined || sessionToken === null ? null : sessionToken,
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
		row.owner_upvoted !== true &&
		row.owner_upvoted !== false &&
		row.owner_upvoted !== 0 &&
		row.owner_upvoted !== 1
	) {
		throw new InvalidInputError("翻訳のowner vote状態が不正です");
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
				CASE WHEN owner_vote.translation_id IS NULL THEN 0 ELSE 1 END AS owner_upvoted,
				viewer_vote.is_upvote AS viewer_is_upvote
		 FROM translations AS t
		 INNER JOIN segments AS s ON s.id = t.segment_id
		 INNER JOIN scriptures AS scripture ON scripture.id = s.scripture_id
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
			t.created_at DESC, t.id DESC`,
		[viewerUserId, ...segmentIds, locale],
	);
	return rows.map(mapTranslation);
}

export async function listTranslations(
	db: SqlExecutor,
	input: unknown,
): Promise<TranslationCandidate[]> {
	const { segmentId, locale, sessionToken } = parseListInput(input);
	const viewerUserId = await readViewerId(db, sessionToken);
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
	sessionToken: string;
};

function parseAddInput(input: unknown): AddTranslationInput {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("翻訳入力が不正です");
	}
	const value = input as Record<string, unknown>;
	if (
		typeof value.sessionToken !== "string" ||
		value.sessionToken.trim().length === 0
	) {
		throw new InvalidInputError("セッショントークンが不正です");
	}
	const translation = parseTranslationInput(value);
	return {
		...translation,
		locale: parseSupportedLocale(translation.locale),
		sessionToken: value.sessionToken,
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
	const tokenHash = await hashSessionToken(request.sessionToken);

	return db.transaction(async (transaction: SqlExecutor) => {
		const user = await requireSessionUserInTransaction(transaction, tokenHash);
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
			[request.segmentId, request.locale, request.text, user.id],
		);
		const id = insertedId(result.lastInsertRowid);
		const row = await transaction.get<TranslationRow>(
			`SELECT id, segment_id, locale, text, point, created_at, updated_at, user_id, source, ai_job_id,
				0 AS owner_upvoted
			 FROM translations WHERE id = ? LIMIT 1`,
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
	const tokenHash = await hashSessionToken(request.sessionToken);

	return db.transaction(async (transaction: SqlExecutor) => {
		const user = await requireSessionUserInTransaction(transaction, tokenHash);
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
		if (job.requested_by !== user.id) {
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
				user.id,
				request.aiJobId,
			],
		);
		const id = insertedId(result.lastInsertRowid);
		const row = await transaction.get<TranslationRow>(
			`SELECT id, segment_id, locale, text, point, created_at, updated_at, user_id, source, ai_job_id,
				0 AS owner_upvoted
			 FROM translations WHERE id = ? LIMIT 1`,
			[id],
		);
		if (!row) throw new Error("作成した翻訳を取得できませんでした");
		return mapTranslation(row);
	});
}

export async function deleteTranslation(
	db: TursoDatabase,
	input: { translationId: unknown; sessionToken: unknown },
): Promise<void> {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("削除入力が不正です");
	}
	if (
		typeof input.sessionToken !== "string" ||
		input.sessionToken.trim().length === 0
	) {
		throw new InvalidInputError("セッショントークンが不正です");
	}
	const translationId = parsePositiveId(input.translationId, "translationId");
	const tokenHash = await hashSessionToken(input.sessionToken);

	await db.transaction(async (transaction: SqlExecutor) => {
		const user = await requireSessionUserInTransaction(transaction, tokenHash);
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
		if (translation.user_id !== user.id) {
			throw new ForbiddenError("この翻訳を削除する権限がありません");
		}
		await transaction.run("DELETE FROM translations WHERE id = ?", [
			translationId,
		]);
	});
}
