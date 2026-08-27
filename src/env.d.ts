/// <reference types="@cloudflare/workers-types" />

import type { TranslationQueueMessage } from "./translation/types";

declare global {
	interface Env {
		TURSO_DATABASE_URL: string;
		TURSO_AUTH_TOKEN: string;
		AUTH_RESEND_KEY: string;
		EMAIL_FROM: string;
		APP_BASE_URL: string;
		TRANSLATION_QUEUE: Queue<TranslationQueueMessage>;
		TRANSLATION_MAX_ATTEMPTS?: string;
		OPENAI_API_KEY?: string;
		DEEPSEEK_API_KEY?: string;
		GEMINI_API_KEY?: string;
	}

	namespace Cloudflare {
		interface Env {
			TURSO_DATABASE_URL: string;
			TURSO_AUTH_TOKEN: string;
			AUTH_RESEND_KEY: string;
			EMAIL_FROM: string;
			APP_BASE_URL: string;
			TRANSLATION_QUEUE: Queue<TranslationQueueMessage>;
			TRANSLATION_MAX_ATTEMPTS?: string;
			OPENAI_API_KEY?: string;
			DEEPSEEK_API_KEY?: string;
			GEMINI_API_KEY?: string;
		}
	}
}

export type { TranslationQueueMessage };
