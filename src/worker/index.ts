import startEntry from "@tanstack/react-start/server-entry";
import { createAuth } from "@/auth/auth";
import { configureAuth } from "@/auth/runtime";
import { createDatabase } from "@/db/client";
import type { TursoDatabase } from "@/db/turso-types";
import { configureDatabase } from "@/server/runtime";
import { decryptLegacyGeminiApiKey } from "@/translation/credentials";
import { getEncryptedGeminiApiKey } from "@/translation/persistence";
import { configureTranslationQueue } from "@/translation/runtime";
import { reconcilePendingTranslationJobs } from "@/translation/service";
import type {
	TranslationMessageBatch,
	TranslationProviderConfig,
	TranslationQueue,
	TranslationWorkerEnv,
} from "@/translation/types";
import { handleTranslationQueue } from "./translation-queue";

function providerConfig(
	env: TranslationWorkerEnv,
	db: TursoDatabase,
): TranslationProviderConfig {
	return {
		openaiApiKey: env.OPENAI_API_KEY,
		deepseekApiKey: env.DEEPSEEK_API_KEY,
		geminiApiKeyForUser: async (userId) => {
			const encrypted = await getEncryptedGeminiApiKey(db, userId);
			return encrypted
				? decryptLegacyGeminiApiKey(encrypted, env.ENCRYPTION_KEY)
				: null;
		},
		vertexProjectId: env.GCP_PROJECT_ID,
		vertexRegion: env.GCP_REGION,
		vertexServiceAccountEmail: env.GCP_SERVICE_ACCOUNT_EMAIL,
		vertexServiceAccountPrivateKey: env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY,
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
	configureAuth(
		createAuth({
			database,
			baseURL: env.APP_BASE_URL,
			secret: env.AUTH_SECRET,
			google: {
				clientId: env.AUTH_GOOGLE_ID,
				clientSecret: env.AUTH_GOOGLE_SECRET,
			},
			resend: {
				apiKey: env.AUTH_RESEND_KEY,
				from: env.EMAIL_FROM,
			},
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
	batch: TranslationMessageBatch,
	env: TranslationWorkerEnv,
): Promise<void> {
	const runtime = configureWorkerRuntime(env);
	await handleTranslationQueue(batch, {
		db: runtime.database,
		queue: runtime.queue,
		providerConfig: providerConfig(env, runtime.database),
	});
}

/** 定期実行で、Queue送信失敗後の古いPENDING jobを再投入する。 */
export async function scheduled(
	_controller: ScheduledController,
	env: TranslationWorkerEnv,
): Promise<void> {
	try {
		const runtime = configureWorkerRuntime(env);
		await reconcilePendingTranslationJobs(runtime.database, runtime.queue);
	} catch {
		// 次回cronで再実行する。DB/Queueの詳細はログやレスポンスへ出さない。
	}
}

/** TanStack StartのHTTP入口を維持しながら、同じWorkerでQueue consumerも公開する。 */
export default {
	fetch,
	queue,
	scheduled,
};
