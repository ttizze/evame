import { describe, expect, it } from "vitest";
import { getAuth } from "@/auth/runtime";
import type { TranslationQueueMessage } from "@/translation/types";
import worker, { configureWorkerRuntime } from "./index";

describe("Worker runtime", () => {
	it("scheduled入口を公開し、定期reconcilerを実行可能にする", () => {
		expect(worker.scheduled).toBeTypeOf("function");
	});

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
			AUTH_SECRET: "test-auth-secret-that-is-long-enough-1234",
			AUTH_GOOGLE_ID: "test-google-client-id",
			AUTH_GOOGLE_SECRET: "test-google-client-secret",
			ENCRYPTION_KEY: "test-encryption-key",
			GCP_PROJECT_ID: "test-project",
			GCP_REGION: "us-central1",
			GCP_SERVICE_ACCOUNT_EMAIL: "translator@example.iam.gserviceaccount.com",
			GCP_SERVICE_ACCOUNT_PRIVATE_KEY: "test-private-key",
			TRANSLATION_QUEUE: queue,
		};

		const first = configureWorkerRuntime(env);
		const second = configureWorkerRuntime(env);

		expect(second).toBe(first);
		expect(second.queue).toBe(queue);
		expect(getAuth().options.socialProviders?.google).toMatchObject({
			clientId: "test-google-client-id",
			clientSecret: "test-google-client-secret",
		});
	});
});
