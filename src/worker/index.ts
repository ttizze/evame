import startEntry from "@tanstack/react-start/server-entry";
import { sendMagicLinkEmail } from "@/auth/email";
import { configureAuthService } from "@/auth/runtime";
import { createAuthService } from "@/auth/service";
import { createDatabase } from "@/db/client";
import type { TursoDatabase } from "@/db/turso-types";
import { createAuthStore } from "@/server/auth-store";
import { configureDatabase } from "@/server/runtime";
import { configureTranslationQueue } from "@/translation/runtime";
import type {
	TranslationProviderConfig,
	TranslationQueue,
	TranslationWorkerEnv,
} from "@/translation/types";
import { handleTranslationQueue, parseMaxAttempts } from "./translation-queue";

function providerConfig(env: TranslationWorkerEnv): TranslationProviderConfig {
	return {
		openaiApiKey: env.OPENAI_API_KEY,
		deepseekApiKey: env.DEEPSEEK_API_KEY,
		geminiApiKey: env.GEMINI_API_KEY,
	};
}

type WorkerRuntime = {
	database: TursoDatabase;
	queue: TranslationQueue;
};

let workerRuntime: WorkerRuntime | undefined;

/**
 * Worker isolate内で一度だけ、Cloudflare bindingをStartのruntimeへ注入する。
 * Tursoのfetch-only clientはリクエスト間で共有できるため、並行リクエストで
 * グローバルruntimeを上書きしたり、stream中にcloseしたりしない。
 */
export function configureWorkerRuntime(
	env: TranslationWorkerEnv,
): WorkerRuntime {
	if (workerRuntime) return workerRuntime;

	const database = createDatabase({
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN,
	});
	const queueBinding = env.TRANSLATION_QUEUE as unknown as TranslationQueue;
	configureDatabase(database);
	configureTranslationQueue(queueBinding);
	configureAuthService(
		createAuthService({
			store: createAuthStore(database),
			publicOrigin: env.APP_BASE_URL,
			sendMagicLink: ({ email, link }) =>
				sendMagicLinkEmail({
					apiKey: env.AUTH_RESEND_KEY,
					from: env.EMAIL_FROM,
					email,
					link,
				}),
		}),
	);
	workerRuntime = { database, queue: queueBinding };
	return workerRuntime;
}

/** Worker isolateのruntimeを初期化してからTanStack Startへ委譲する。 */
export async function fetch(
	request: Request,
	env: TranslationWorkerEnv,
): Promise<Response> {
	configureWorkerRuntime(env);
	return startEntry.fetch(request);
}

export async function queue(
	batch: {
		messages: readonly {
			body: unknown;
			attempts?: number;
			ack(): void | Promise<void>;
			retry(options?: { delaySeconds?: number }): void | Promise<void>;
		}[];
	},
	env: TranslationWorkerEnv,
): Promise<void> {
	const runtime = configureWorkerRuntime(env);
	await handleTranslationQueue(batch, {
		db: runtime.database,
		queue: runtime.queue,
		providerConfig: providerConfig(env),
		maxAttempts: parseMaxAttempts(env.TRANSLATION_MAX_ATTEMPTS),
	});
}

/** TanStack StartのHTTP入口を維持しながら、同じWorkerでQueue consumerも公開する。 */
export default {
	fetch,
	queue,
};
