import { afterEach, beforeEach, expect, it, vi } from "vitest";

const {
	createClient,
	mkdir,
	readFile,
	rm,
	writeFile,
	createTestHarness,
	startTursoServer,
} = vi.hoisted(() => ({
	mkdir: vi.fn(),
	readFile: vi.fn(),
	rm: vi.fn(),
	writeFile: vi.fn(),
	createTestHarness: vi.fn(),
	startTursoServer: vi.fn(),
	createClient: vi.fn(),
}));
vi.mock("@libsql/client", () => ({ createClient }));
vi.mock("drizzle-orm/libsql", () => ({ drizzle: vi.fn() }));
vi.mock("drizzle-orm/libsql/migrator", () => ({ migrate: vi.fn() }));
vi.mock("seroval", () => ({ toJSONAsync: vi.fn() }));
vi.mock("wrangler", () => ({ createTestHarness }));
vi.mock("./turso-dev-server.mjs", () => ({ startTursoServer }));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({
	mkdir,
	readdir: vi.fn(),
	readFile,
	rm,
	writeFile,
}));

beforeEach(() => {
	vi.resetModules();
	createClient.mockReset().mockImplementation(() => {
		throw new Error("Preview DBへの接続まで到達");
	});
	for (const mock of [
		mkdir,
		rm,
		writeFile,
		createTestHarness,
		startTursoServer,
	])
		mock.mockReset();
	readFile.mockReset().mockResolvedValue("{}");
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

it("ユーザー削除とDB終了が失敗してもR2削除と結果保存を試行し全失敗を報告する", async () => {
	vi.stubEnv(
		"CONNECTED_PREVIEW_ORIGIN",
		"https://pr-1170-evame-start.reimei.workers.dev",
	);
	vi.stubEnv(
		"CONNECTED_PREVIEW_READER_ORIGIN",
		"https://pr-1170-evame-reader.reimei.workers.dev",
	);
	const secrets = JSON.parse(process.env.EVAME_PREVIEW_SECRETS ?? "{}");
	vi.stubEnv(
		"EVAME_PREVIEW_SECRETS",
		JSON.stringify({ ...secrets, PREVIEW_READER_SECRET: "test-secret" }),
	);
	const execute = vi
		.fn()
		.mockRejectedValueOnce(new Error("検証の初期化失敗"))
		.mockRejectedValueOnce(new Error("ユーザー削除失敗"));
	createClient.mockReturnValue({
		execute,
		close: () => {
			throw new Error("DB終了失敗");
		},
	});
	const cleanup = vi
		.fn()
		.mockResolvedValue(new Response(null, { status: 204 }));
	vi.stubGlobal("fetch", cleanup);
	try {
		const error = await import("./check-reader-connected.mjs").catch(
			(error) => error,
		);
		expect(cleanup).toHaveBeenCalledOnce();
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringContaining("result.json"),
			expect.any(String),
		);
		expect(error).toBeInstanceOf(AggregateError);
		expect(error.errors.map((entry: Error) => entry.message)).toEqual([
			"検証の初期化失敗",
			"ユーザー削除失敗",
			"DB終了失敗",
		]);
	} finally {
		vi.unstubAllGlobals();
	}
});

it("Worker終了が失敗してもTurso停止と設定削除と結果保存を試行する", async () => {
	vi.stubEnv("CONNECTED_PREVIEW_ORIGIN", "");
	createClient.mockReturnValue({ execute: vi.fn(), close: vi.fn() });
	const stop = vi.fn();
	startTursoServer.mockResolvedValue({ url: "http://127.0.0.1:8080", stop });
	const close = vi.fn().mockRejectedValue(new Error("Worker終了失敗"));
	createTestHarness.mockReturnValue({
		listen: () => {
			throw new Error("Worker起動失敗");
		},
		close,
	});
	const error = await import("./check-reader-connected.mjs").catch(
		(error) => error,
	);
	expect(close).toHaveBeenCalledOnce();
	expect(stop).toHaveBeenCalledOnce();
	expect(rm).toHaveBeenCalledWith(expect.stringContaining("connected-"), {
		force: true,
	});
	expect(writeFile).toHaveBeenCalledWith(
		expect.stringContaining("result.json"),
		expect.any(String),
	);
	expect(error).toBeInstanceOf(AggregateError);
});

it("Cloudflare Previewでも生成失敗の検証を省略せず保存成功の誤報を検出する", async () => {
	vi.stubEnv(
		"CONNECTED_PREVIEW_ORIGIN",
		"https://pr-1170-evame-start.reimei.workers.dev",
	);
	vi.stubEnv(
		"CONNECTED_PREVIEW_READER_ORIGIN",
		"https://reader-pr-1170-evame-start.reimei.workers.dev",
	);
	vi.stubEnv("EVAME_CONNECTED_BROWSER", "");
	const secrets = JSON.parse(process.env.EVAME_PREVIEW_SECRETS ?? "{}");
	vi.stubEnv(
		"EVAME_PREVIEW_SECRETS",
		JSON.stringify({ ...secrets, PREVIEW_READER_SECRET: "test-secret" }),
	);
	createClient.mockReturnValue({
		execute: vi.fn().mockResolvedValue({ rows: [{ id: 7 }] }),
		close: vi.fn(),
	});
	const names = ["editPageContent", "togglePublishAction", "archivePageAction"];
	const resolver = names
		.map(
			(name, index) =>
				`"${String(index).repeat(64)}": { functionName: "${name}_createServerFn_handler" }`,
		)
		.join(",");
	readFile.mockResolvedValue(resolver);
	const { readdir } = await import("node:fs/promises");
	vi.mocked(readdir).mockResolvedValue(["server-fn-resolver-test.js"] as never);
	const send = vi.fn(async (url: URL, init: RequestInit = {}) => {
		if (new URL(url).pathname.startsWith("/__"))
			return new Response(null, { status: 204 });
		if (
			init.body instanceof FormData &&
			String(init.body.get("pageContent")).includes("並行保存")
		)
			throw new Error("失敗後の再試行の検証が省略された");
		return new Response("保存応答の直後の本文", {
			headers: { "X-Evame-HTML": "publication" },
		});
	});
	vi.stubGlobal("fetch", send);
	try {
		await expect(import("./check-reader-connected.mjs")).rejects.toThrow(
			"R2生成の失敗を保存成功にしない",
		);
		expect(
			send.mock.calls.some(
				([url]) => new URL(url).pathname === "/__invalidate",
			),
		).toBe(true);
	} finally {
		vi.unstubAllGlobals();
	}
});
