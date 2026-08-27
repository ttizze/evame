import { DomainError, InvalidInputError, NotFoundError } from "@/domain/errors";
import { markTranslationJobFailed } from "@/translation/persistence";
import { TranslationProviderError } from "@/translation/provider";
import {
	PartialTranslationError,
	processTranslationChunk,
	publicTranslationError,
	startTranslationJob,
} from "@/translation/service";
import type {
	TranslationDatabase,
	TranslationMessageBatch,
	TranslationProviderConfig,
	TranslationQueue,
	TranslationQueueMessageLike,
} from "@/translation/types";
import { parseTranslationQueueMessage } from "@/translation/validation";

const DEFAULT_MAX_ATTEMPTS = 3;

export function parseMaxAttempts(value: unknown): number {
	if (typeof value !== "string") return DEFAULT_MAX_ATTEMPTS;
	const normalized = value.trim();
	if (!/^\d+$/u.test(normalized)) return DEFAULT_MAX_ATTEMPTS;
	const parsed = Number.parseInt(normalized, 10);
	return Number.isSafeInteger(parsed) && parsed > 0
		? parsed
		: DEFAULT_MAX_ATTEMPTS;
}

export function retryDelaySeconds(
	attempts: number,
	maxAttempts: number,
): number | null {
	if (
		!Number.isSafeInteger(attempts) ||
		attempts < 1 ||
		attempts >= maxAttempts
	)
		return null;
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

async function acknowledge(
	message: TranslationQueueMessageLike,
): Promise<void> {
	await message.ack();
}

/** Queue payloadを再検証し、失敗したchunkだけを再試行するconsumer本体。 */
export async function handleTranslationQueue(
	batch: TranslationMessageBatch,
	dependencies: {
		db: TranslationDatabase;
		queue: TranslationQueue;
		providerConfig: TranslationProviderConfig;
		maxAttempts?: number;
	},
): Promise<void> {
	const maxAttempts = dependencies.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	for (const message of batch.messages) {
		let payload: ReturnType<typeof parseTranslationQueueMessage>;
		try {
			payload = parseTranslationQueueMessage(message.body);
		} catch {
			// 不正な外部payloadは再試行しても直らないため、秘密値を含めず破棄する。
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
			const attempts = messageAttempts(message);
			const delaySeconds = isRetryable(error)
				? retryDelaySeconds(attempts, maxAttempts)
				: null;
			if (delaySeconds !== null) {
				await message.retry({ delaySeconds });
				continue;
			}

			try {
				await markTranslationJobFailed(
					dependencies.db,
					payload.jobId,
					publicTranslationError(error),
				);
			} catch {
				// 失敗を記録できない場合でも、同じ毒性payloadを無限再試行しない。
			}
			await acknowledge(message);
		}
	}
}
