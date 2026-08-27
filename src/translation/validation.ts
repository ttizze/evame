import { InvalidInputError } from "@/domain/errors";
import { parsePositiveId, parseSupportedLocale } from "@/domain/vote";
import type {
	TranslationJobRequest,
	TranslationQueueMessage,
	TranslationResult,
	TranslationSegment,
} from "./types";
import { TRANSLATION_MODELS } from "./types";

const MAX_JOB_ID_LENGTH = 128;
const MAX_MODEL_LENGTH = 128;
const MAX_CONTEXT_LENGTH = 8_000;
const MAX_SEGMENTS_PER_CHUNK = 1_000;
const MAX_SEGMENT_TEXT_LENGTH = 50_000;

function recordInput(value: unknown, message: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new InvalidInputError(message);
	}
	return value as Record<string, unknown>;
}

function requiredText(
	value: unknown,
	fieldName: string,
	maxLength: number,
): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new InvalidInputError(`${fieldName} は空にできません`);
	}
	if (value.length > maxLength) {
		throw new InvalidInputError(`${fieldName} が長すぎます`);
	}
	return value;
}

function optionalContext(value: unknown): string {
	if (value === undefined || value === null) return "";
	if (typeof value !== "string" || value.length > MAX_CONTEXT_LENGTH) {
		throw new InvalidInputError("translationContext が不正です");
	}
	return value;
}

function parseModel(value: unknown): string {
	const model = requiredText(value, "model", MAX_MODEL_LENGTH);
	if (!TRANSLATION_MODELS.some((supportedModel) => supportedModel === model)) {
		throw new InvalidInputError("対応していない翻訳modelです");
	}
	return model;
}

function parseJobId(value: unknown): string {
	const id = requiredText(value, "jobId", MAX_JOB_ID_LENGTH);
	if (/\s/u.test(id)) throw new InvalidInputError("jobId が不正です");
	return id;
}

function parseSessionToken(value: unknown): string {
	return requiredText(value, "sessionToken", 512);
}

function parseSegment(value: unknown): TranslationSegment {
	const object = recordInput(value, "翻訳セグメントが不正です");
	const id = parsePositiveId(object.id, "segment.id");
	const number = object.number;
	if (
		typeof number !== "number" ||
		!Number.isSafeInteger(number) ||
		number < 0
	) {
		throw new InvalidInputError(
			"segment.number は0以上の整数で指定してください",
		);
	}
	const text = requiredText(
		object.text,
		"segment.text",
		MAX_SEGMENT_TEXT_LENGTH,
	);
	return { id, number, text };
}

function parseSegments(value: unknown): TranslationSegment[] {
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.length > MAX_SEGMENTS_PER_CHUNK
	) {
		throw new InvalidInputError("segments が不正です");
	}
	return value.map(parseSegment);
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
		throw new InvalidInputError(`${fieldName} は0以上の整数で指定してください`);
	}
	return value;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
	const number = parseNonNegativeInteger(value, fieldName);
	if (number === 0)
		throw new InvalidInputError(`${fieldName} は正の整数で指定してください`);
	return number;
}

/** POSTで受け取る翻訳ジョブを、仏典セグメント専用の入力へ正規化する。 */
export function parseTranslationJobRequest(
	value: unknown,
	sessionTokenOverride?: string,
): TranslationJobRequest {
	const object = recordInput(value, "翻訳ジョブ入力が不正です");
	if (
		"pageId" in object ||
		"pageCommentId" in object ||
		"annotationContentId" in object
	) {
		throw new InvalidInputError(
			"翻訳ジョブは仏典scriptureIdだけを対象にします",
		);
	}

	const scriptureId = parsePositiveId(object.scriptureId, "scriptureId");
	const localeValue = object.locale ?? object.targetLocale;
	const locale = parseSupportedLocale(localeValue);
	const model = parseModel(object.model ?? object.aiModel);
	const sessionToken = parseSessionToken(
		sessionTokenOverride ?? object.sessionToken,
	);
	const rawIdempotencyKey = object.idempotencyKey;
	const idempotencyKey =
		rawIdempotencyKey === undefined ? undefined : parseJobId(rawIdempotencyKey);

	return {
		scriptureId,
		locale,
		model,
		translationContext: optionalContext(object.translationContext),
		sessionToken,
		...(idempotencyKey ? { idempotencyKey } : {}),
	};
}

/** Queueから届いた値は外部入力として再検証し、許可したフィールドだけを残す。 */
export function parseTranslationQueueMessage(
	value: unknown,
): TranslationQueueMessage {
	const object = recordInput(value, "翻訳Queue payloadが不正です");
	const kind = object.kind ?? object.type;
	const jobId = parseJobId(object.jobId);
	const translationContext = optionalContext(object.translationContext);

	if (kind === "translation-job") {
		const idempotencyKey =
			object.idempotencyKey === undefined
				? undefined
				: parseJobId(object.idempotencyKey);
		return {
			kind: "translation-job",
			jobId,
			translationContext,
			...(idempotencyKey ? { idempotencyKey } : {}),
		};
	}

	if (kind !== "translation-chunk") {
		throw new InvalidInputError("Queue payloadのkindが不正です");
	}

	const chunkId = parseJobId(object.chunkId);
	const chunkIndex = parseNonNegativeInteger(object.chunkIndex, "chunkIndex");
	const totalChunks = parsePositiveInteger(object.totalChunks, "totalChunks");
	if (chunkIndex >= totalChunks) {
		throw new InvalidInputError("chunkIndex がtotalChunksの範囲外です");
	}
	const scriptureId = parsePositiveId(object.scriptureId, "scriptureId");
	const locale = parseSupportedLocale(object.locale);
	const model = parseModel(object.model);
	const segments = parseSegments(object.segments);

	return {
		kind: "translation-chunk",
		jobId,
		chunkId,
		chunkIndex,
		totalChunks,
		scriptureId,
		locale,
		model,
		translationContext,
		segments,
	};
}

export function parseTranslationResult(
	value: unknown,
): TranslationResult | null {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return null;
	const object = value as Record<string, unknown>;
	if (
		typeof object.number !== "number" ||
		!Number.isSafeInteger(object.number) ||
		object.number < 0 ||
		typeof object.text !== "string" ||
		object.text.trim().length === 0 ||
		object.text.length > MAX_SEGMENT_TEXT_LENGTH
	) {
		return null;
	}
	return { number: object.number, text: object.text.trim() };
}

export { MAX_CONTEXT_LENGTH, MAX_SEGMENT_TEXT_LENGTH, MAX_SEGMENTS_PER_CHUNK };
