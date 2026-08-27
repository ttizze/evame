import { describe, expect, it } from "vitest";
import type { TranslationQueueMessage } from "@/translation/types";
import { configureWorkerRuntime } from "./index";

describe("Worker runtime", () => {
	it("同一isolates内ではDB/Auth/Queue依存を再利用する", () => {
		const queue = {
			send: async (_message: TranslationQueueMessage) => undefined,
		};
		const env = {
			TURSO_DATABASE_URL: "turso://evame-runtime-test.turso.io",
			TURSO_AUTH_TOKEN: "test-turso-token",
			AUTH_RESEND_KEY: "test-resend-key",
			EMAIL_FROM: "Evame <test@example.com>",
			APP_BASE_URL: "https://example.com",
			TRANSLATION_QUEUE: queue,
		};

		const first = configureWorkerRuntime(env);
		const second = configureWorkerRuntime(env);

		expect(second).toBe(first);
		expect(second.queue).toBe(queue);
	});
});
