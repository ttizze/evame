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
import { splitTranslationSegments } from "./chunk";
import { calculateChunkProgress } from "./progress";
import type {
	TranslationJob,
	TranslationResult,
	TranslationSegment,
} from "./types";
import { parseTranslationJobRequest } from "./validation";

const JOB_COLUMNS = `id, scripture_id, locale, status, progress, total, error,
	model, requested_by, created_at, updated_at, translation_context`;

const PENDING_JOB_STALE_QUERY = `SELECT ${JOB_COLUMNS}
	FROM translation_jobs
	WHERE status = 'PENDING'
		AND updated_at <= ?
		AND EXISTS (
			SELECT 1 FROM scriptures
			WHERE scriptures.id = translation_jobs.scripture_id
				AND scriptures.published_at IS NOT NULL
		)
	ORDER BY updated_at ASC, id ASC
	LIMIT ?`;

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
	translation_context: unknown;
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
	const translationContext =
		row.translation_context === null || row.translation_context === undefined
			? ""
			: typeof row.translation_context === "string"
				? row.translation_context
				: (() => {
						throw new InvalidInputError(
							"翻訳ジョブのtranslation_contextが不正です",
						);
					})();
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
		translationContext,
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

/** 旧Evame互換のユーザープランを取得する。見つからない場合はfree扱いにする。 */
export async function getUserPlan(
	db: SqlExecutor,
	userId: string,
): Promise<string | null> {
	const row = await db.get<{ plan: unknown }>(
		"SELECT plan FROM users WHERE id = ? LIMIT 1",
		[userId],
	);
	return typeof row?.plan === "string" ? row.plan : null;
}

/** 旧Evame互換の、暗号化されたユーザーGemini API keyを取得する。 */
export async function getEncryptedGeminiApiKey(
	db: SqlExecutor,
	userId: string,
): Promise<string | null> {
	const row = await db.get<{ api_key: unknown }>(
		"SELECT api_key FROM gemini_api_keys WHERE user_id = ? LIMIT 1",
		[userId],
	);
	return typeof row?.api_key === "string" ? row.api_key : null;
}

/** AI翻訳のsource/user関係を維持するため、モデルごとのis_aiユーザーを冪等に取得する。 */
export async function getOrCreateAiUser(
	db: SqlExecutor,
	model: string,
): Promise<string> {
	const existing = await db.get<{ id: unknown }>(
		"SELECT id FROM users WHERE handle = ? LIMIT 1",
		[model],
	);
	if (typeof existing?.id === "string" && existing.id.length > 0) {
		return existing.id;
	}

	const id = globalThis.crypto.randomUUID();
	await db.run(
		`INSERT INTO users (id, email, name, handle, is_ai)
			 VALUES (?, ?, ?, ?, 1)`,
		[id, `${model}@ai.com`, model, model],
	);
	return id;
}

/** 認証済みのユーザーが作成したジョブを冪等に取得または作成する。 */
export async function createTranslationJob(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationJob> {
	const request = parseTranslationJobRequest(input);
	const id = request.idempotencyKey ?? globalThis.crypto.randomUUID();

	return db.transaction(async (transaction) => {
		const scripture = await transaction.get<{ id: number }>(
			"SELECT id FROM scriptures WHERE id = ? AND published_at IS NOT NULL LIMIT 1",
			[request.scriptureId],
		);
		if (!scripture) throw new NotFoundError("経典が見つかりません");

		await transaction.run(
			`INSERT INTO translation_jobs
			 (id, scripture_id, locale, status, progress, total, error, model,
			  requested_by, translation_context)
			 VALUES (?, ?, ?, 'PENDING', 0, 0, '', ?, ?, ?)
			 ON CONFLICT(id) DO NOTHING`,
			[
				id,
				request.scriptureId,
				request.locale,
				request.model,
				request.userId,
				request.translationContext,
			],
		);
		const row = await transaction.get<RawJobRow>(
			`SELECT ${JOB_COLUMNS} FROM translation_jobs WHERE id = ? LIMIT 1`,
			[id],
		);
		if (!row) throw new Error("作成した翻訳ジョブを取得できませんでした");
		const job = mapTranslationJob(row);
		if (
			job.requestedBy !== request.userId ||
			job.scriptureId !== request.scriptureId ||
			job.locale !== request.locale ||
			job.model !== request.model ||
			job.translationContext !== request.translationContext
		) {
			if (job.requestedBy !== request.userId) {
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

/** Queueへ再投入する対象を、古いPENDING jobに限定して取得する。 */
export async function listStalePendingTranslationJobs(
	db: SqlExecutor,
	staleBefore: string,
	limit: number,
): Promise<TranslationJobRow[]> {
	if (typeof staleBefore !== "string" || staleBefore.trim().length === 0) {
		throw new InvalidInputError("翻訳jobの期限境界が不正です");
	}
	if (!Number.isSafeInteger(limit) || limit < 1) {
		throw new InvalidInputError("翻訳jobの取得上限が不正です");
	}
	return db.all<TranslationJobRow>(PENDING_JOB_STALE_QUERY, [
		staleBefore,
		limit,
	]);
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

const TRANSLATION_CHUNK_LEASE_MS = 10 * 60 * 1_000;

function retryAfterSeconds(leaseUntil: string | null, now: number): number {
	if (!leaseUntil) return 1;
	const remaining = Date.parse(leaseUntil) - now;
	if (!Number.isFinite(remaining) || remaining <= 0) return 1;
	return Math.max(1, Math.ceil(remaining / 1_000));
}

export type TranslationJobChunkClaim =
	| { state: "claimed"; leaseToken: string }
	| { state: "busy"; retryAfterSeconds: number }
	| { state: "completed" };

/** rootの再配信とchunkの再配信が共有する、job単位の永続chunk行を準備する。 */
export async function ensureTranslationJobChunks(
	db: TursoDatabase,
	jobId: string,
	totalChunks: number,
): Promise<void> {
	const validatedJobId = validateJobId(jobId);
	if (!Number.isSafeInteger(totalChunks) || totalChunks < 0) {
		throw new InvalidInputError("totalChunks が不正です");
	}
	await db.transaction(async (transaction) => {
		for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
			await transaction.run(
				`INSERT INTO translation_job_chunks
					(job_id, chunk_index, status)
					VALUES (?, ?, 'PENDING')
					ON CONFLICT(job_id, chunk_index) DO NOTHING`,
				[validatedJobId, chunkIndex],
			);
		}
	});
}

/**
 * Queue送信またはprovider実行の所有権を短いleaseで取得する。
 * SQLiteの条件付きUPDATEをtransaction内で行うため、同時再配信は一方だけがclaimedになる。
 */
export async function claimTranslationJobChunk(
	db: TursoDatabase,
	jobId: string,
	chunkIndex: number,
	phase: "enqueue" | "process",
): Promise<TranslationJobChunkClaim> {
	const validatedJobId = validateJobId(jobId);
	if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0) {
		throw new InvalidInputError("chunkIndex が不正です");
	}
	if (phase !== "enqueue" && phase !== "process") {
		throw new InvalidInputError("chunk claimのphaseが不正です");
	}

	return db.transaction(async (transaction) => {
		const current = await transaction.get<{
			status: string;
			lease_until: string | null;
		}>(
			`SELECT status, lease_until
			 FROM translation_job_chunks
			 WHERE job_id = ? AND chunk_index = ?
			 LIMIT 1`,
			[validatedJobId, chunkIndex],
		);
		if (!current) throw new NotFoundError("翻訳chunkが見つかりません");
		if (current.status === "COMPLETED") return { state: "completed" };

		const nowTimestamp = Date.now();
		const now = new Date(nowTimestamp).toISOString();
		const leaseUntil = new Date(
			nowTimestamp + TRANSLATION_CHUNK_LEASE_MS,
		).toISOString();
		const leaseToken = globalThis.crypto.randomUUID();
		const activeLease =
			typeof current.lease_until === "string" && current.lease_until > now;

		if (phase === "enqueue") {
			if (current.status === "ENQUEUED" || current.status === "PROCESSING") {
				return { state: "completed" };
			}
			if (current.status === "ENQUEUING" && activeLease) {
				return {
					state: "busy",
					retryAfterSeconds: retryAfterSeconds(
						current.lease_until,
						nowTimestamp,
					),
				};
			}
			if (current.status !== "PENDING" && current.status !== "ENQUEUING") {
				throw new InvalidInputError("翻訳chunkのenqueue状態が不正です");
			}
			const result = await transaction.run(
				`UPDATE translation_job_chunks
				 SET status = 'ENQUEUING', lease_until = ?, lease_token = ?,
					enqueue_attempts = enqueue_attempts + 1,
					updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
				 WHERE job_id = ? AND chunk_index = ?
					AND (
						status = 'PENDING'
						OR (status = 'ENQUEUING' AND (lease_until IS NULL OR lease_until <= ?))
					)`,
				[leaseUntil, leaseToken, validatedJobId, chunkIndex, now],
			);
			return result.changes === 1
				? { state: "claimed", leaseToken }
				: { state: "busy", retryAfterSeconds: 1 };
		}

		if (
			current.status !== "PENDING" &&
			current.status !== "ENQUEUING" &&
			current.status !== "ENQUEUED" &&
			current.status !== "PROCESSING"
		) {
			throw new InvalidInputError("翻訳chunkのprocess状態が不正です");
		}
		if (current.status === "PROCESSING" && activeLease) {
			return {
				state: "busy",
				retryAfterSeconds: retryAfterSeconds(current.lease_until, nowTimestamp),
			};
		}
		const result = await transaction.run(
			`UPDATE translation_job_chunks
			 SET status = 'PROCESSING', lease_until = ?, lease_token = ?,
				processing_attempts = processing_attempts + 1,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE job_id = ? AND chunk_index = ?
				AND (
					status IN ('PENDING', 'ENQUEUING', 'ENQUEUED')
					OR (status = 'PROCESSING' AND (lease_until IS NULL OR lease_until <= ?))
				)`,
			[leaseUntil, leaseToken, validatedJobId, chunkIndex, now],
		);
		return result.changes === 1
			? { state: "claimed", leaseToken }
			: { state: "busy", retryAfterSeconds: 1 };
	});
}

/** claimを送信済み・再試行可能・処理完了の状態へ条件付きで確定する。 */
export async function settleTranslationJobChunkClaim(
	db: TursoDatabase,
	input:
		| {
				phase: "enqueue";
				outcome: "sent" | "retry";
				jobId: string;
				chunkIndex: number;
				leaseToken: string;
		  }
		| {
				phase: "process";
				outcome: "completed" | "retry";
				jobId: string;
				chunkIndex: number;
				leaseToken: string;
		  },
): Promise<void> {
	const jobId = validateJobId(input.jobId);
	if (!Number.isSafeInteger(input.chunkIndex) || input.chunkIndex < 0) {
		throw new InvalidInputError("chunkIndex が不正です");
	}
	if (input.leaseToken.trim().length === 0) {
		throw new InvalidInputError("chunk lease tokenが不正です");
	}
	const isEnqueue = input.phase === "enqueue";
	const nextStatus =
		input.outcome === "sent" || input.outcome === "completed"
			? input.phase === "enqueue"
				? "ENQUEUED"
				: "COMPLETED"
			: input.phase === "enqueue"
				? "PENDING"
				: "ENQUEUED";
	const expectedStatus = isEnqueue ? "ENQUEUING" : "PROCESSING";
	await db.run(
		`UPDATE translation_job_chunks
			 SET status = ?, lease_until = NULL, lease_token = NULL,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE job_id = ? AND chunk_index = ?
				AND status = ? AND lease_token = ?`,
		[nextStatus, jobId, input.chunkIndex, expectedStatus, input.leaseToken],
	);
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
	model: string;
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
		let aiUserId: string | undefined;
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
			aiUserId ??= await getOrCreateAiUser(transaction, input.model);
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
					aiUserId,
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
		const sourceSegments =
			current.scriptureId === null
				? []
				: await getScriptureSegments(transaction, current.scriptureId);
		const chunks = splitTranslationSegments(sourceSegments, current.model);
		const completedRows = await transaction.all<{ segment_id: unknown }>(
			`SELECT DISTINCT translations.segment_id
				 FROM translations
				 INNER JOIN segments ON segments.id = translations.segment_id
				 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
				 WHERE translations.ai_job_id = ?
					AND translations.locale = ?
					AND segments.scripture_id = ?
					AND scriptures.published_at IS NOT NULL`,
			[jobId, current.locale, current.scriptureId],
		);
		const completedIds = new Set(
			completedRows.flatMap((row) => {
				try {
					const id = integer(row.segment_id, "segment_id");
					return id > 0 ? [id] : [];
				} catch {
					return [];
				}
			}),
		);
		const completedChunkIndices = chunks.flatMap((chunk, index) =>
			chunk.every((segment) => completedIds.has(segment.id)) ? [index] : [],
		);
		const completed =
			chunks.length === 0 || completedChunkIndices.length === chunks.length;
		const calculatedProgress = calculateChunkProgress(
			chunks.length,
			completedChunkIndices,
		);
		const nextStatus = completed ? "COMPLETED" : "IN_PROGRESS";
		const nextProgress = completed
			? 100
			: Math.max(current.progress, calculatedProgress);
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
