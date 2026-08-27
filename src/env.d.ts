/// <reference types="@cloudflare/workers-types" />

import type { TranslationQueueMessage } from "./translation/types";

declare global {
	interface Env {
		TURSO_DATABASE_URL: string;
		TURSO_AUTH_TOKEN: string;
		AUTH_RESEND_KEY: string;
		EMAIL_FROM: string;
		APP_BASE_URL: string;
		AUTH_SECRET: string;
		AUTH_GOOGLE_ID: string;
		AUTH_GOOGLE_SECRET: string;
		TRANSLATION_QUEUE: Queue<TranslationQueueMessage>;
		ENCRYPTION_KEY: string;
		GCP_PROJECT_ID: string;
		GCP_REGION: string;
		GCP_SERVICE_ACCOUNT_EMAIL: string;
		GCP_SERVICE_ACCOUNT_PRIVATE_KEY: string;
		OPENAI_API_KEY?: string;
		DEEPSEEK_API_KEY?: string;
	}

	namespace Cloudflare {
		interface Env {
			TURSO_DATABASE_URL: string;
			TURSO_AUTH_TOKEN: string;
			AUTH_RESEND_KEY: string;
			EMAIL_FROM: string;
			APP_BASE_URL: string;
			AUTH_SECRET: string;
			AUTH_GOOGLE_ID: string;
			AUTH_GOOGLE_SECRET: string;
			TRANSLATION_QUEUE: Queue<TranslationQueueMessage>;
			ENCRYPTION_KEY: string;
			GCP_PROJECT_ID: string;
			GCP_REGION: string;
			GCP_SERVICE_ACCOUNT_EMAIL: string;
			GCP_SERVICE_ACCOUNT_PRIVATE_KEY: string;
			OPENAI_API_KEY?: string;
			DEEPSEEK_API_KEY?: string;
		}
	}
}

export type { TranslationQueueMessage };
