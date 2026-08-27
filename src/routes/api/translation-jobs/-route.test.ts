import { describe, expect, it } from "vitest";
import type { Auth } from "@/auth/auth";
import type { TursoDatabase } from "@/db/turso-types";
import type { TranslationQueue } from "@/translation/types";
import { handleCreateTranslationJob, Route } from "./route";

const dependencies = {
	db: {} as TursoDatabase,
	queue: {
		send: async () => undefined,
	} as TranslationQueue,
};

describe("翻訳ジョブAPI", () => {
	it("未認証の作成要求を受け付けない", async () => {
		const auth = {
			api: { getSession: async () => null },
		} as unknown as Auth;
		const response = await handleCreateTranslationJob(
			new Request("https://example.com/api/translation-jobs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					scriptureId: 1,
					locale: "en",
					model: "gpt-5-nano-2025-08-07",
				}),
			}),
			{ ...dependencies, auth },
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "unauthenticated" });
	});

	it("任意のジョブIDを公開GETで参照できない", () => {
		const handlers = Route.options.server?.handlers as
			| { GET?: unknown; POST?: unknown }
			| undefined;

		expect(handlers?.GET).toBeUndefined();
		expect(handlers?.POST).toBeDefined();
	});
});
