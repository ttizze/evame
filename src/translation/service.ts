import { InvalidInputError, NotFoundError } from "@/domain/errors";
import { splitTranslationSegments } from "./chunk";
import {
	createTranslationJob,
	getScriptureSegments,
	getScriptureTitle,
	getTranslationJobById,
	markTranslationJobFailed,
	readCompletedSegmentIds,
	saveAiTranslations,
	setTranslationJobTotal,
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
				translationContext: request.translationContext,
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
			// Queue障害を隠さず、DB障害の詳細はレスポンスへ出さない。
		}
		throw error;
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

	const messages = chunks.map((chunk, index) => {
		return chunkMessage(
			started,
			chunk,
			index,
			chunks.length,
			translationContext,
		);
	});
	if (queue.sendBatch) {
		await queue.sendBatch(
			messages.map((body) => ({ body, contentType: "json" as const })),
		);
	} else {
		for (const message of messages) {
			await queue.send(message, { contentType: "json" });
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

	const provider = getProviderFromModel(job.model);
	const raw = await requestTranslation(
		{
			provider,
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
		requestedBy: job.requestedBy,
		translations: results,
		segments: pendingSegments,
	});
	const updated = await updateTranslationJobProgress(db, job.id);
	const completedAfterSave = await readCompletedSegmentIds(
		db,
		job.id,
		job.locale,
		pendingSegments.map((segment) => segment.id),
	);
	if (pendingSegments.some((segment) => !completedAfterSave.has(segment.id))) {
		throw new PartialTranslationError();
	}
	return updated;
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
