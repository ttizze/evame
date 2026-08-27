import { InvalidInputError, NotFoundError } from "@/domain/errors";
import { splitTranslationSegments } from "./chunk";
import {
	claimTranslationJobChunk,
	createTranslationJob,
	ensureTranslationJobChunks,
	getScriptureSegments,
	getScriptureTitle,
	getTranslationJobById,
	getUserPlan,
	listStalePendingTranslationJobs,
	mapTranslationJob,
	markTranslationJobFailed,
	readCompletedSegmentIds,
	saveAiTranslations,
	setTranslationJobTotal,
	settleTranslationJobChunkClaim,
	updateTranslationJobProgress,
} from "./persistence";
import {
	getProviderFromModel,
	parseTranslationResponse,
	requestTranslation,
	TranslationProviderError,
} from "./provider";
import type {
	TranslationDatabase,
	TranslationJob,
	TranslationJobRequest,
	TranslationProviderConfig,
	TranslationQueue,
	TranslationQueueMessage,
	TranslationSegment,
} from "./types";

export class PartialTranslationError extends Error {
	readonly retryable = true;

	constructor() {
		super("一部のセグメントを翻訳できませんでした。");
		this.name = "PartialTranslationError";
	}
}

/** 別Workerがchunkのleaseを保持中で、期限後の再配信が必要な状態を表す。 */
export class TranslationChunkBusyError extends Error {
	readonly retryable = true;
	readonly retryAfterSeconds: number;

	constructor(retryAfterSeconds: number) {
		super("翻訳chunkは別のWorkerが処理中です。");
		this.name = "TranslationChunkBusyError";
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

export const TRANSLATION_JOB_RECONCILE_STALE_MS = 5 * 60 * 1_000;
export const TRANSLATION_JOB_RECONCILE_BATCH_SIZE = 25;
export const TRANSLATION_JOB_RECONCILE_TIME_BUDGET_MS = 10_000;

type ReconcilePendingTranslationJobsOptions = {
	now?: number;
	clock?: () => number;
	staleAfterMs?: number;
	batchSize?: number;
	timeBudgetMs?: number;
};

export type ReconcilePendingTranslationJobsResult = {
	inspected: number;
	enqueued: number;
	failed: number;
	timedOut: boolean;
};

/** Queue障害後に残った古いPENDING jobを、同じjob IDで再投入する。 */
export async function reconcilePendingTranslationJobs(
	db: TranslationDatabase,
	queue: TranslationQueue,
	options: ReconcilePendingTranslationJobsOptions = {},
): Promise<ReconcilePendingTranslationJobsResult> {
	const clock = options.clock ?? (() => options.now ?? Date.now());
	const startedAt = options.now ?? clock();
	const staleAfterMs =
		options.staleAfterMs ?? TRANSLATION_JOB_RECONCILE_STALE_MS;
	const batchSize = options.batchSize ?? TRANSLATION_JOB_RECONCILE_BATCH_SIZE;
	const timeBudgetMs =
		options.timeBudgetMs ?? TRANSLATION_JOB_RECONCILE_TIME_BUDGET_MS;
	if (
		!Number.isFinite(startedAt) ||
		!Number.isFinite(staleAfterMs) ||
		staleAfterMs < 0
	) {
		throw new InvalidInputError("翻訳jobの時刻境界が不正です");
	}
	if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
		throw new InvalidInputError("翻訳jobの取得上限が不正です");
	}
	if (!Number.isFinite(timeBudgetMs) || timeBudgetMs <= 0) {
		throw new InvalidInputError("翻訳jobの処理時間上限が不正です");
	}
	const effectiveBatchSize = Math.min(
		batchSize,
		TRANSLATION_JOB_RECONCILE_BATCH_SIZE,
	);

	const rows = await listStalePendingTranslationJobs(
		db,
		new Date(startedAt - staleAfterMs).toISOString(),
		effectiveBatchSize,
	);
	let inspected = 0;
	let enqueued = 0;
	let failed = 0;
	let timedOut = false;
	for (const row of rows.slice(0, effectiveBatchSize)) {
		if (clock() - startedAt >= timeBudgetMs) {
			timedOut = true;
			break;
		}
		inspected += 1;
		let job: TranslationJob;
		try {
			job = mapTranslationJob(row);
		} catch {
			failed += 1;
			continue;
		}
		if (job.status !== "PENDING") continue;
		try {
			await queue.send(
				{
					kind: "translation-job",
					jobId: job.id,
					translationContext: job.translationContext,
					idempotencyKey: job.id,
				},
				{ contentType: "json" },
			);
			enqueued += 1;
		} catch {
			failed += 1;
		}
	}
	return { inspected, enqueued, failed, timedOut };
}

/** 認証済み入力からジョブを作成し、長時間処理をQueueへ委譲する。 */
export async function createAndEnqueueTranslationJob(
	db: TranslationDatabase,
	queue: TranslationQueue,
	request: TranslationJobRequest,
): Promise<TranslationJob> {
	const job = await createTranslationJob(db, request);
	try {
		await queue.send(
			{
				kind: "translation-job",
				jobId: job.id,
				translationContext: job.translationContext,
				// Queue message idとDBのidempotency keyを同じ値にする。
				idempotencyKey: job.id,
			},
			{ contentType: "json" },
		);
	} catch (error) {
		try {
			await markTranslationJobFailed(
				db,
				job.id,
				"翻訳Queueへの登録に失敗しました。",
			);
		} catch {
			// DB障害の詳細は公開せず、元のQueue障害をcauseへ保持して再試行を促す。
		}
		throw new Error("翻訳Queueへの登録に失敗しました。", { cause: error });
	}
	return job;
}

function chunkMessage(
	job: TranslationJob,
	chunk: TranslationSegment[],
	chunkIndex: number,
	totalChunks: number,
	translationContext: string,
): TranslationQueueMessage {
	if (job.scriptureId === null) {
		throw new InvalidInputError("翻訳ジョブにscriptureIdがありません");
	}
	return {
		kind: "translation-chunk",
		jobId: job.id,
		chunkId: `${job.id}:chunk:${chunkIndex}`,
		chunkIndex,
		totalChunks,
		scriptureId: job.scriptureId,
		locale: job.locale,
		model: job.model,
		translationContext,
		segments: chunk,
	};
}

/** 1回のHTTP処理を短く保つため、root messageからchunkをQueueへ分配する。 */
export async function startTranslationJob(
	db: TranslationDatabase,
	queue: TranslationQueue,
	jobId: string,
	translationContext: string,
): Promise<TranslationJob> {
	const job = await getTranslationJobById(db, jobId);
	if (job.status === "COMPLETED" || job.status === "FAILED") return job;
	if (job.scriptureId === null) {
		throw new InvalidInputError("翻訳ジョブにscriptureIdがありません");
	}

	// セグメントが0件でも、存在しない経典を誤って完了扱いにしない。
	await getScriptureTitle(db, job.scriptureId);
	const segments = await getScriptureSegments(db, job.scriptureId);
	const chunks = splitTranslationSegments(segments, job.model);
	const started = await setTranslationJobTotal(db, job.id, segments.length);
	if (started.status === "COMPLETED" || chunks.length === 0) return started;
	if (started.status === "FAILED") return started;
	await ensureTranslationJobChunks(db, started.id, chunks.length);

	for (const [index, chunk] of chunks.entries()) {
		const claim = await claimTranslationJobChunk(
			db,
			started.id,
			index,
			"enqueue",
		);
		if (claim.state === "completed") continue;
		if (claim.state === "busy") {
			throw new TranslationChunkBusyError(claim.retryAfterSeconds);
		}
		const message = chunkMessage(
			started,
			chunk,
			index,
			chunks.length,
			translationContext,
		);
		try {
			await queue.send(message, { contentType: "json" });
			await settleTranslationJobChunkClaim(db, {
				phase: "enqueue",
				outcome: "sent",
				jobId: started.id,
				chunkIndex: index,
				leaseToken: claim.leaseToken,
			});
		} catch (error) {
			try {
				await settleTranslationJobChunkClaim(db, {
					phase: "enqueue",
					outcome: "retry",
					jobId: started.id,
					chunkIndex: index,
					leaseToken: claim.leaseToken,
				});
			} catch {
				// Queue障害の元エラーを優先し、leaseの期限切れ回復に委ねる。
			}
			throw error;
		}
	}
	return started;
}

function uniquePendingResults(
	results: ReturnType<typeof parseTranslationResponse>,
	pendingSegments: readonly TranslationSegment[],
): ReturnType<typeof parseTranslationResponse> {
	const allowedNumbers = new Set(
		pendingSegments.map((segment) => segment.number),
	);
	const seen = new Set<number>();
	return results.filter((result) => {
		if (!allowedNumbers.has(result.number) || seen.has(result.number))
			return false;
		seen.add(result.number);
		return true;
	});
}

/** Queueの1 chunkだけを処理する。再配信されても既存行を再挿入しない。 */
export async function processTranslationChunk(
	db: TranslationDatabase,
	input: Extract<TranslationQueueMessage, { kind: "translation-chunk" }>,
	providerConfig: TranslationProviderConfig,
): Promise<TranslationJob> {
	const job = await getTranslationJobById(db, input.jobId);
	if (job.status === "COMPLETED" || job.status === "FAILED") return job;
	if (
		job.scriptureId !== input.scriptureId ||
		job.locale !== input.locale ||
		job.model !== input.model
	) {
		throw new InvalidInputError("Queueの翻訳条件がジョブと一致しません");
	}
	const completedIds = await readCompletedSegmentIds(
		db,
		job.id,
		job.locale,
		input.segments.map((segment) => segment.id),
	);
	const pendingSegments = input.segments.filter(
		(segment) => !completedIds.has(segment.id),
	);
	if (pendingSegments.length === 0) {
		return updateTranslationJobProgress(db, job.id);
	}
	if (!job.requestedBy)
		throw new InvalidInputError("翻訳ジョブのrequestedByがありません");

	const claim = await claimTranslationJobChunk(
		db,
		job.id,
		input.chunkIndex,
		"process",
	);
	if (claim.state !== "claimed") {
		if (claim.state === "busy") {
			throw new TranslationChunkBusyError(claim.retryAfterSeconds);
		}
		return updateTranslationJobProgress(db, job.id);
	}

	try {
		const provider = getProviderFromModel(
			job.model,
			(await getUserPlan(db, job.requestedBy)) ?? undefined,
		);
		const userGeminiApiKey =
			provider === "gemini" && providerConfig.geminiApiKeyForUser
				? await providerConfig.geminiApiKeyForUser(job.requestedBy)
				: undefined;
		const raw = await requestTranslation(
			{
				provider,
				...(userGeminiApiKey ? { apiKey: userGeminiApiKey } : {}),
				model: job.model,
				targetLocale: job.locale,
				title: await getScriptureTitle(db, input.scriptureId),
				segments: pendingSegments,
				translationContext: input.translationContext,
			},
			providerConfig,
		);
		const results = uniquePendingResults(
			parseTranslationResponse(raw),
			pendingSegments,
		);
		if (results.length === 0) throw new PartialTranslationError();

		await saveAiTranslations(db, {
			jobId: job.id,
			locale: job.locale,
			model: job.model,
			requestedBy: job.requestedBy,
			translations: results,
			segments: pendingSegments,
		});
		await settleTranslationJobChunkClaim(db, {
			phase: "process",
			outcome: "completed",
			jobId: job.id,
			chunkIndex: input.chunkIndex,
			leaseToken: claim.leaseToken,
		});
		const updated = await updateTranslationJobProgress(db, job.id);
		const completedAfterSave = await readCompletedSegmentIds(
			db,
			job.id,
			job.locale,
			pendingSegments.map((segment) => segment.id),
		);
		if (
			pendingSegments.some((segment) => !completedAfterSave.has(segment.id))
		) {
			throw new PartialTranslationError();
		}
		return updated;
	} catch (error) {
		try {
			await settleTranslationJobChunkClaim(db, {
				phase: "process",
				outcome: "retry",
				jobId: job.id,
				chunkIndex: input.chunkIndex,
				leaseToken: claim.leaseToken,
			});
		} catch {
			// leaseの期限切れで次のQueue配信がclaimを回復する。
		}
		throw error;
	}
}

export function publicTranslationError(error: unknown): string {
	if (error instanceof PartialTranslationError) return error.message;
	if (error instanceof TranslationProviderError && error.status === 429) {
		return "翻訳providerの利用上限に達しました。時間をおいて再試行してください。";
	}
	if (error instanceof NotFoundError) return error.message;
	if (error instanceof InvalidInputError) return error.message;
	return "翻訳に失敗しました。";
}
