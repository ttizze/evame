import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "@/db/turso-types";
import {
	ForbiddenError,
	InvalidInputError,
	NotFoundError,
} from "@/domain/errors";
import {
	hashSessionToken,
	requireSessionUserInTransaction,
} from "@/server/session";
import {
	calculateTranslationProgress,
	isTranslationComplete,
} from "./progress";
import type {
	TranslationJob,
	TranslationResult,
	TranslationSegment,
} from "./types";
import { parseTranslationJobRequest } from "./validation";

const JOB_COLUMNS = `id, scripture_id, locale, status, progress, total, error,
	model, requested_by, created_at, updated_at`;

type RawJobRow = Omit<TranslationJobRow, keyof TranslationJobRow> & {
	id: unknown;
	scripture_id: unknown;
	locale: unknown;
	status: unknown;
	progress: unknown;
	total: unknown;
	error: unknown;
	model: unknown;
	requested_by: unknown;
	created_at: unknown;
	updated_at: unknown;
};

function integer(value: unknown, fieldName: string): number {
	const parsed = typeof value === "bigint" ? Number(value) : value;
	if (typeof parsed !== "number" || !Number.isSafeInteger(parsed)) {
		throw new InvalidInputError(`${fieldName} が不正です`);
	}
	return parsed;
}

function optionalPositiveInteger(
	value: unknown,
	fieldName: string,
): number | null {
	if (value === null || value === undefined) return null;
	const parsed = integer(value, fieldName);
	if (parsed <= 0) throw new InvalidInputError(`${fieldName} が不正です`);
	return parsed;
}

function status(value: unknown): TranslationJob["status"] {
	if (
		value !== "PENDING" &&
		value !== "IN_PROGRESS" &&
		value !== "COMPLETED" &&
		value !== "FAILED"
	) {
		throw new InvalidInputError("翻訳ジョブのstatusが不正です");
	}
	return value;
}

export function mapTranslationJob(
	row: RawJobRow | TranslationJobRow,
): TranslationJob {
	if (typeof row.id !== "string" || row.id.trim().length === 0) {
		throw new InvalidInputError("翻訳ジョブのidが不正です");
	}
	if (typeof row.locale !== "string" || typeof row.model !== "string") {
		throw new InvalidInputError("翻訳ジョブのlocaleまたはmodelが不正です");
	}
	if (
		typeof row.error !== "string" ||
		typeof row.created_at !== "string" ||
		typeof row.updated_at !== "string"
	) {
		throw new InvalidInputError("翻訳ジョブの時刻またはerrorが不正です");
	}
	const progress = integer(row.progress, "progress");
	const total = integer(row.total, "total");
	if (progress < 0 || progress > 100 || total < 0) {
		throw new InvalidInputError("翻訳ジョブの進捗が不正です");
	}
	return {
		id: row.id,
		scriptureId: optionalPositiveInteger(row.scripture_id, "scripture_id"),
		locale: row.locale,
		model: row.model,
		status: status(row.status),
		progress,
		total,
		error: row.error,
		requestedBy:
			row.requested_by === null || row.requested_by === undefined
				? null
				: typeof row.requested_by === "string"
					? row.requested_by
					: (() => {
							throw new InvalidInputError("翻訳ジョブのrequested_byが不正です");
						})(),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function readJob(
	db: SqlExecutor,
	jobId: string,
): Promise<TranslationJob> {
	const row = await db.get<RawJobRow>(
		`SELECT ${JOB_COLUMNS} FROM translation_jobs WHERE id = ?
			AND EXISTS (
				SELECT 1 FROM scriptures
				WHERE scriptures.id = translation_jobs.scripture_id
					AND scriptures.published_at IS NOT NULL
			)
		 LIMIT 1`,
		[jobId],
	);
	if (!row) throw new NotFoundError("翻訳ジョブが見つかりません");
	return mapTranslationJob(row);
}

/** 認証済みのユーザーが作成したジョブを冪等に取得または作成する。 */
export async function createTranslationJob(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationJob> {
	const request = parseTranslationJobRequest(input);
	const tokenHash = await hashSessionToken(request.sessionToken);
	const id = request.idempotencyKey ?? globalThis.crypto.randomUUID();

	return db.transaction(async (transaction) => {
		const user = await requireSessionUserInTransaction(transaction, tokenHash);
		const scripture = await transaction.get<{ id: number }>(
			"SELECT id FROM scriptures WHERE id = ? AND published_at IS NOT NULL LIMIT 1",
			[request.scriptureId],
		);
		if (!scripture) throw new NotFoundError("経典が見つかりません");

		await transaction.run(
			`INSERT INTO translation_jobs
			 (id, scripture_id, locale, status, progress, total, error, model, requested_by)
			 VALUES (?, ?, ?, 'PENDING', 0, 0, '', ?, ?)
			 ON CONFLICT(id) DO NOTHING`,
			[id, request.scriptureId, request.locale, request.model, user.id],
		);
		const row = await transaction.get<RawJobRow>(
			`SELECT ${JOB_COLUMNS} FROM translation_jobs WHERE id = ? LIMIT 1`,
			[id],
		);
		if (!row) throw new Error("作成した翻訳ジョブを取得できませんでした");
		const job = mapTranslationJob(row);
		if (
			job.requestedBy !== user.id ||
			job.scriptureId !== request.scriptureId ||
			job.locale !== request.locale ||
			job.model !== request.model
		) {
			if (job.requestedBy !== user.id) {
				throw new ForbiddenError("この翻訳ジョブを操作する権限がありません");
			}
			throw new InvalidInputError("冪等性キーが別の翻訳条件に使用されています");
		}
		return job;
	});
}

export function validateJobId(jobId: unknown): string {
	if (
		typeof jobId !== "string" ||
		jobId.trim().length === 0 ||
		jobId.length > 128 ||
		/\s/u.test(jobId)
	) {
		throw new InvalidInputError("jobId が不正です");
	}
	return jobId;
}

export async function getTranslationJobById(
	db: SqlExecutor,
	jobId: unknown,
): Promise<TranslationJob> {
	return readJob(db, validateJobId(jobId));
}

type SegmentRow = {
	id: unknown;
	position: unknown;
	source_text: unknown;
};

export async function getScriptureSegments(
	db: SqlExecutor,
	scriptureId: number,
): Promise<TranslationSegment[]> {
	const rows = await db.all<SegmentRow>(
		`SELECT id, position, source_text
		 FROM segments
		 WHERE scripture_id = ?
			AND EXISTS (
				SELECT 1 FROM scriptures
				WHERE scriptures.id = segments.scripture_id
					AND scriptures.published_at IS NOT NULL
			)
		 ORDER BY position ASC, id ASC`,
		[scriptureId],
	);
	return rows.map((row) => {
		const id = integer(row.id, "segment.id");
		const number = integer(row.position, "segment.position");
		if (
			id <= 0 ||
			number < 0 ||
			typeof row.source_text !== "string" ||
			row.source_text.trim().length === 0
		) {
			throw new InvalidInputError("翻訳対象セグメントが不正です");
		}
		return { id, number, text: row.source_text };
	});
}

export async function getScriptureTitle(
	db: SqlExecutor,
	scriptureId: number,
): Promise<string> {
	const row = await db.get<{ title: unknown }>(
		"SELECT title FROM scriptures WHERE id = ? AND published_at IS NOT NULL LIMIT 1",
		[scriptureId],
	);
	if (!row) throw new NotFoundError("経典が見つかりません");
	return typeof row?.title === "string" ? row.title : "";
}

export async function setTranslationJobTotal(
	db: TursoDatabase,
	jobId: string,
	total: number,
): Promise<TranslationJob> {
	if (!Number.isSafeInteger(total) || total < 0) {
		throw new InvalidInputError("total が不正です");
	}
	return db.transaction(async (transaction) => {
		const current = await readJob(transaction, validateJobId(jobId));
		if (current.status === "COMPLETED" || current.status === "FAILED")
			return current;
		if (
			current.total === total &&
			total > 0 &&
			current.status === "IN_PROGRESS"
		) {
			return current;
		}
		const completed = total === 0;
		await transaction.run(
			`UPDATE translation_jobs
			 SET total = ?, status = ?, progress = ?, error = '',
				 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE id = ? AND status NOT IN ('COMPLETED', 'FAILED')`,
			[
				total,
				completed ? "COMPLETED" : "IN_PROGRESS",
				completed ? 100 : current.progress,
				jobId,
			],
		);
		return readJob(transaction, jobId);
	});
}

export async function readCompletedSegmentIds(
	db: SqlExecutor,
	jobId: string,
	locale: string,
	segmentIds: readonly number[],
): Promise<Set<number>> {
	if (segmentIds.length === 0) return new Set();
	const placeholders = segmentIds.map(() => "?").join(", ");
	const rows = await db.all<{ segment_id: unknown }>(
		`SELECT DISTINCT segment_id FROM translations
		 INNER JOIN segments ON segments.id = translations.segment_id
		 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
		 WHERE ai_job_id = ? AND locale = ? AND segment_id IN (${placeholders})
			AND scriptures.published_at IS NOT NULL`,
		[jobId, locale, ...segmentIds],
	);
	return new Set(
		rows.flatMap((row) => {
			try {
				const id = integer(row.segment_id, "segment_id");
				return id > 0 ? [id] : [];
			} catch {
				return [];
			}
		}),
	);
}

type SaveAiTranslationInput = {
	jobId: string;
	locale: string;
	requestedBy: string | null;
	translations: readonly TranslationResult[];
	segments: readonly TranslationSegment[];
};

export async function saveAiTranslations(
	db: TursoDatabase,
	input: SaveAiTranslationInput,
): Promise<number> {
	if (!input.requestedBy) throw new ForbiddenError("AI翻訳の作成者が不明です");
	const segmentByNumber = new Map(
		input.segments.map((segment) => [segment.number, segment]),
	);
	return db.transaction(async (transaction) => {
		let inserted = 0;
		const seenNumbers = new Set<number>();
		for (const translation of input.translations) {
			if (seenNumbers.has(translation.number)) continue;
			seenNumbers.add(translation.number);
			const segment = segmentByNumber.get(translation.number);
			if (!segment) continue;
			const publishedSegment = await transaction.get<{ id: number }>(
				`SELECT segments.id
				 FROM segments
				 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
				 INNER JOIN translation_jobs
					ON translation_jobs.scripture_id = segments.scripture_id
				 WHERE segments.id = ?
					AND scriptures.published_at IS NOT NULL
					AND translation_jobs.id = ?
					AND translation_jobs.locale = ?
					AND translation_jobs.requested_by = ?
				 LIMIT 1`,
				[segment.id, input.jobId, input.locale, input.requestedBy],
			);
			if (!publishedSegment) {
				throw new NotFoundError("AI翻訳対象の経典が公開されていません");
			}
			const result = await transaction.run(
				`INSERT INTO translations
				 (segment_id, locale, text, point, user_id, source, ai_job_id)
				 SELECT ?, ?, ?, 0, ?, 'AI', ?
				 FROM segments
				 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
				 INNER JOIN translation_jobs
					ON translation_jobs.scripture_id = segments.scripture_id
				 WHERE segments.id = ?
					AND scriptures.published_at IS NOT NULL
					AND translation_jobs.id = ?
					AND translation_jobs.locale = ?
					AND translation_jobs.requested_by = ?
					AND NOT EXISTS (
					 SELECT 1 FROM translations
					 WHERE segment_id = ? AND locale = ? AND ai_job_id = ?
				 )`,
				[
					segment.id,
					input.locale,
					translation.text,
					input.requestedBy,
					input.jobId,
					segment.id,
					input.jobId,
					input.locale,
					input.requestedBy,
					segment.id,
					input.locale,
					input.jobId,
				],
			);
			inserted += result.changes;
		}
		return inserted;
	});
}

export async function updateTranslationJobProgress(
	db: TursoDatabase,
	jobId: string,
): Promise<TranslationJob> {
	return db.transaction(async (transaction) => {
		const current = await readJob(transaction, validateJobId(jobId));
		if (current.status === "COMPLETED" || current.status === "FAILED")
			return current;
		const countRow = await transaction.get<{ count: unknown }>(
			`SELECT COUNT(DISTINCT t.segment_id) AS count
				 FROM translations AS t
				 INNER JOIN segments AS s ON s.id = t.segment_id
				 INNER JOIN scriptures AS scripture ON scripture.id = s.scripture_id
				 WHERE t.ai_job_id = ? AND t.locale = ?
					AND scripture.published_at IS NOT NULL`,
			[jobId, current.locale],
		);
		const translatedCount = integer(countRow?.count ?? 0, "translated_count");
		const completed = isTranslationComplete(translatedCount, current.total);
		const nextStatus = completed ? "COMPLETED" : "IN_PROGRESS";
		const nextProgress = completed
			? 100
			: Math.max(
					current.progress,
					calculateTranslationProgress(translatedCount, current.total),
				);
		await transaction.run(
			`UPDATE translation_jobs
			 SET status = ?, progress = ?,
				 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE id = ? AND status NOT IN ('COMPLETED', 'FAILED')`,
			[nextStatus, nextProgress, jobId],
		);
		return readJob(transaction, jobId);
	});
}

export async function markTranslationJobFailed(
	db: TursoDatabase,
	jobId: string,
	errorMessage: string,
): Promise<TranslationJob> {
	const safeError =
		typeof errorMessage === "string" && errorMessage.trim().length > 0
			? errorMessage.trim().slice(0, 2_000)
			: "翻訳に失敗しました。";
	return db.transaction(async (transaction) => {
		await transaction.run(
			`UPDATE translation_jobs
			 SET status = 'FAILED', error = ?,
				 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE id = ? AND status NOT IN ('COMPLETED', 'FAILED')
				AND EXISTS (
					SELECT 1 FROM scriptures
					WHERE scriptures.id = translation_jobs.scripture_id
						AND scriptures.published_at IS NOT NULL
				)`,
			[safeError, validateJobId(jobId)],
		);
		return readJob(transaction, jobId);
	});
}
