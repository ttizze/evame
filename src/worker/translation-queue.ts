import { DomainError, InvalidInputError, NotFoundError } from "@/domain/errors";
import {
	markTranslationJobFailed,
	validateJobId,
} from "@/translation/persistence";
import { TranslationProviderError } from "@/translation/provider";
import {
	PartialTranslationError,
	processTranslationChunk,
	publicTranslationError,
	startTranslationJob,
	TranslationChunkBusyError,
} from "@/translation/service";
import type {
	TranslationDatabase,
	TranslationMessageBatch,
	TranslationProviderConfig,
	TranslationQueue,
	TranslationQueueMessageLike,
} from "@/translation/types";
import { parseTranslationQueueMessage } from "@/translation/validation";

export const TRANSLATION_DEAD_LETTER_QUEUE_NAME =
	"digital-buddhism-translations-dlq";

export function isTranslationDeadLetterQueue(queueName: string): boolean {
	return queueName === TRANSLATION_DEAD_LETTER_QUEUE_NAME;
}

/** Queueの配送試行間隔。再試行上限はWranglerのmax_retriesへ委譲する。 */
export function retryDelaySeconds(attempts: number): number {
	if (!Number.isSafeInteger(attempts) || attempts < 1) return 1;
	return Math.min(300, 2 ** (attempts - 1));
}

function isRetryable(error: unknown): boolean {
	if (
		error instanceof InvalidInputError ||
		error instanceof NotFoundError ||
		error instanceof DomainError
	) {
		return false;
	}
	if (error instanceof TranslationProviderError) return error.retryable;
	if (error instanceof PartialTranslationError) return true;
	return true;
}

function messageAttempts(message: TranslationQueueMessageLike): number {
	return typeof message.attempts === "number" &&
		Number.isSafeInteger(message.attempts) &&
		message.attempts > 0
		? message.attempts
		: 1;
}

function jobIdFromPayload(value: unknown): string | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return null;
	}
	const candidate = (value as Record<string, unknown>).jobId;
	if (typeof candidate !== "string") return null;
	try {
		return validateJobId(candidate);
	} catch {
		return null;
	}
}

async function acknowledge(
	message: TranslationQueueMessageLike,
): Promise<void> {
	await message.ack();
}

async function failJob(
	db: TranslationDatabase,
	jobId: string | null,
	errorMessage: string,
): Promise<void> {
	if (!jobId) return;
	await markTranslationJobFailed(db, jobId, errorMessage);
}

async function handleDeadLetterMessages(
	batch: TranslationMessageBatch,
	db: TranslationDatabase,
): Promise<void> {
	for (const message of batch.messages) {
		const jobId = jobIdFromPayload(message.body);
		let reason = "翻訳Queueの再試行上限に達しました。";
		try {
			parseTranslationQueueMessage(message.body);
		} catch {
			reason = "翻訳Queue payloadが不正です。";
		}
		await failJob(db, jobId, reason);
		await acknowledge(message);
	}
}

/** Queue payloadを再検証し、失敗したchunkだけを再試行するconsumer本体。 */
export async function handleTranslationQueue(
	batch: TranslationMessageBatch,
	dependencies: {
		db: TranslationDatabase;
		queue: TranslationQueue;
		providerConfig: TranslationProviderConfig;
	},
): Promise<void> {
	if (isTranslationDeadLetterQueue(batch.queue)) {
		await handleDeadLetterMessages(batch, dependencies.db);
		return;
	}

	for (const message of batch.messages) {
		let payload: ReturnType<typeof parseTranslationQueueMessage>;
		try {
			payload = parseTranslationQueueMessage(message.body);
		} catch {
			// 不正な外部payloadは再試行しても直らないため、jobIdだけ記録して破棄する。
			await failJob(
				dependencies.db,
				jobIdFromPayload(message.body),
				"翻訳Queue payloadが不正です。",
			);
			await acknowledge(message);
			continue;
		}

		try {
			if (payload.kind === "translation-job") {
				await startTranslationJob(
					dependencies.db,
					dependencies.queue,
					payload.jobId,
					payload.translationContext,
				);
			} else {
				await processTranslationChunk(
					dependencies.db,
					payload,
					dependencies.providerConfig,
				);
			}
			await acknowledge(message);
		} catch (error) {
			if (error instanceof TranslationChunkBusyError) {
				// claimのlease期限後に同じpayloadを再配信し、途中クラッシュでも
				// ENQUEUING/PROCESSING状態を永久に残さない。
				await message.retry({
					delaySeconds: error.retryAfterSeconds,
				});
				continue;
			}
			if (isRetryable(error)) {
				// 再試行上限とDLQへの移送はWranglerへ委譲し、ここではackしない。
				await message.retry({
					delaySeconds: retryDelaySeconds(messageAttempts(message)),
				});
				continue;
			}

			await failJob(
				dependencies.db,
				payload.jobId,
				publicTranslationError(error),
			);
			await acknowledge(message);
		}
	}
}
