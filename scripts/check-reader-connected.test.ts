import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
	createClient: vi.fn(() => {
		throw new Error("Preview DBへの接続まで到達");
	}),
}));
vi.mock("@libsql/client", () => ({ createClient }));
vi.mock("drizzle-orm/libsql", () => ({ drizzle: vi.fn() }));
vi.mock("drizzle-orm/libsql/migrator", () => ({ migrate: vi.fn() }));
vi.mock("seroval", () => ({ toJSONAsync: vi.fn() }));
vi.mock("wrangler", () => ({ createTestHarness: vi.fn() }));
vi.mock("./turso-dev-server.mjs", () => ({ startTursoServer: vi.fn() }));
vi.mock("node:fs/promises", () => ({
	mkdir: vi.fn(),
	readdir: vi.fn(),
	readFile: vi.fn(),
	rm: vi.fn(),
	writeFile: vi.fn(),
}));

beforeEach(() => {
	vi.resetModules();
	createClient.mockClear();
	vi.spyOn(console, "log").mockImplementation(() => {});
	vi.stubEnv(
		"EVAME_PREVIEW_SECRETS",
		JSON.stringify({
			TURSO_DATABASE_URL: "libsql://evame-preview-test.turso.io",
			TURSO_AUTH_TOKEN: "preview-test-token",
			BETTER_AUTH_SECRET: "preview-test-secret-at-least-32-characters",
		}),
	);
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

it("アカウント名を含むCloudflareのPR Preview URLで接続検証を開始できる", async () => {
	vi.stubEnv(
		"CONNECTED_PREVIEW_ORIGIN",
		"https://pr-1170-evame-start.reimei.workers.dev",
	);
	await expect(import("./check-reader-connected.mjs")).rejects.toThrow(
		"Preview DBへの接続まで到達",
	);
	expect(createClient).toHaveBeenCalledExactlyOnceWith({
		url: "libsql://evame-preview-test.turso.io",
		authToken: "preview-test-token",
	});
});

it.each([
	"https://evame-start.reimei.workers.dev",
	"https://evame.tech",
	"http://pr-1170-evame-start.reimei.workers.dev",
	"https://pr-1170-evame-start.reimei.workers.dev.example.test",
	"https://pr-1170-evame-start.reimei.workers.dev/path",
])("PR Preview以外のURL %s ではDBへ接続しない", async (origin) => {
	vi.stubEnv("CONNECTED_PREVIEW_ORIGIN", origin);
	await expect(import("./check-reader-connected.mjs")).rejects.toThrow();
	expect(createClient).not.toHaveBeenCalled();
});
