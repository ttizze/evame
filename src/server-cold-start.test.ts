import { expect, it, vi } from "vitest";

const loaded = vi.hoisted(() => [] as string[]);
vi.mock("virtual:evame-public-pages", () => {
	loaded.push("Astro");
	return { default: { fetch: vi.fn() } };
});
vi.mock("@tanstack/react-start/server-entry", () => {
	loaded.push("TanStack Start");
	return { default: { fetch: vi.fn() } };
});
vi.mock("./db", () => {
	loaded.push("DB");
	return { createDb: vi.fn(), databaseScope: { run: vi.fn() } };
});
vi.mock("./db/queries", () => {
	loaded.push("DB queries");
	return { fetchReaderRevision: vi.fn() };
});
vi.mock("./app/_service/update-reader-publication", () => {
	loaded.push("publication");
	return { updateReaderPublication: vi.fn() };
});
vi.mock("@sentry/cloudflare", () => ({
	withSentry: (_options: unknown, entry: unknown) => entry,
	captureException: vi.fn(),
}));

import server from "./server";

it("起動直後のR2のHITでAstro・編集アプリ・DB・更新処理を読み込まない", async () => {
	vi.stubEnv("TURSO_DATABASE_URL", "libsql://reader-test.turso.io");
	const response = await server.fetch(
		new Request("https://evame.test/ja"),
		{
			SETTINGS: { get: async () => false },
			CF_VERSION_METADATA: { id: "test" },
			PUBLIC_HTML: {
				get: async () => ({
					customMetadata: { state: "ready", revision: "1", generation: "test" },
					json: async () => ({
						startedAt: Date.now(),
						headers: [["Content-Type", "text/html"]],
						body: "公開本文",
					}),
				}),
			},
		} as never,
		{
			exports: { PublicPages: { fetch: vi.fn(), publish: vi.fn() } },
			waitUntil: vi.fn(),
		},
	);
	expect(await response.text()).toBe("公開本文");
	expect(loaded).toEqual([]);
});
