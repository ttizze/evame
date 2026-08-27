import type { SqlExecutor, TursoDatabase } from "@/db/turso-types";

export const TRANSLATION_MODELS = [
	"gemini-2.0-flash",
	"gemini-2.5-flash-lite",
	"gemini-2.5-flash",
	"gpt-5-nano-2025-08-07",
	"deepseek-reasoner",
] as const;

export const DEFAULT_TRANSLATION_MODEL = TRANSLATION_MODELS[0];

export const TRANSLATION_JOB_STATUSES = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
] as const;

export type TranslationJobStatus = (typeof TRANSLATION_JOB_STATUSES)[number];

/** 仏典の翻訳対象。number は既存セグメントの position を維持する。 */
export type TranslationSegment = {
	id: number;
	number: number;
	text: string;
};

export type TranslationResult = {
	number: number;
	text: string;
};

export type TranslationJob = {
	id: string;
	scriptureId: number | null;
	locale: string;
	model: string;
	status: TranslationJobStatus;
	progress: number;
	total: number;
	error: string;
	requestedBy: string | null;
	createdAt: string;
	updatedAt: string;
};

export type TranslationJobRequest = {
	scriptureId: number;
	locale: string;
	model: string;
	translationContext: string;
	sessionToken: string;
	idempotencyKey?: string;
};

export type TranslationProviderName = "openai" | "deepseek" | "gemini";

export type ProviderTranslationInput = {
	model: string;
	targetLocale: string;
	title: string;
	segments: readonly TranslationSegment[];
	translationContext: string;
};

export type TranslationProvider = {
	translate(input: ProviderTranslationInput): Promise<string>;
};

export type TranslationProviderConfig = {
	openaiApiKey?: string;
	deepseekApiKey?: string;
	geminiApiKey?: string;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
	/** テストまたは専用のAPIプロキシでのみ上書きする。 */
	openaiBaseUrl?: string;
	deepseekBaseUrl?: string;
	geminiBaseUrl?: string;
};

export type TranslationQueueMessage =
	| {
			kind: "translation-job";
			jobId: string;
			translationContext: string;
			idempotencyKey?: string;
	  }
	| {
			kind: "translation-chunk";
			jobId: string;
			chunkId: string;
			chunkIndex: number;
			totalChunks: number;
			scriptureId: number;
			locale: string;
			model: string;
			translationContext: string;
			segments: TranslationSegment[];
	  };

export type TranslationQueueSendOptions = {
	contentType?: "json";
	delaySeconds?: number;
};

export type TranslationQueue = {
	send(
		message: TranslationQueueMessage,
		options?: TranslationQueueSendOptions,
	): Promise<void>;
	/** Cloudflare Queues の sendBatch を使える binding だけが実装する。 */
	sendBatch?(
		messages: ReadonlyArray<{
			body: TranslationQueueMessage;
			contentType?: "json";
			// Queue bindingの型差を吸収するため任意にする。
			delaySeconds?: number;
		}>,
	): Promise<void>;
};

export type TranslationDatabase = TursoDatabase;
export type TranslationSqlExecutor = SqlExecutor;

export type TranslationQueueMessageLike = {
	body: unknown;
	attempts?: number;
	ack(): void | Promise<void>;
	retry(options?: { delaySeconds?: number }): void | Promise<void>;
};

export type TranslationMessageBatch = {
	messages: readonly TranslationQueueMessageLike[];
};

export type TranslationWorkerEnv = TranslationProviderConfig & {
	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN?: string;
	AUTH_RESEND_KEY: string;
	EMAIL_FROM: string;
	APP_BASE_URL: string;
	TRANSLATION_QUEUE: TranslationQueue;
	TRANSLATION_MAX_ATTEMPTS?: string;
	OPENAI_API_KEY?: string;
	DEEPSEEK_API_KEY?: string;
	GEMINI_API_KEY?: string;
};
