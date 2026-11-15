import { afterEach, beforeEach, expect, it, vi } from "vitest";

const {
	createClient,
	copyTestDatabase,
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
	copyTestDatabase: vi.fn(),
}));
vi.mock("@libsql/client", () => ({ createClient }));
vi.mock("seroval", () => ({ toJSONAsync: vi.fn() }));
vi.mock("wrangler", () => ({ createTestHarness }));
vi.mock("./test-database.mjs", () => ({ copyTestDatabase }));
vi.mock("./prepare-reader-connected.mjs", () => ({
	prepareReaderConnected: async () => "dist/server/connected-wrangler.json",
}));
vi.mock("./turso-dev-server.mjs", () => ({ startTursoServer }));
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
		copyTestDatabase,
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

it("ユーザー削除とDB終了が失敗しても結果保存を試行し全失敗を報告する", async () => {
	vi.stubEnv(
		"CONNECTED_PREVIEW_ORIGIN",
		"https://pr-1170-evame-start.reimei.workers.dev",
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
		expect(cleanup).not.toHaveBeenCalled();
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

it("Worker終了が失敗してもTurso停止と結果保存を試行する", async () => {
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
	expect(createTestHarness).toHaveBeenCalledWith({
		workers: [
			expect.objectContaining({
				configPath: "dist/server/connected-wrangler.json",
			}),
		],
	});
	expect(rm).not.toHaveBeenCalled();
	expect(writeFile).toHaveBeenCalledWith(
		expect.stringContaining("result.json"),
		expect.any(String),
	);
	expect(error).toBeInstanceOf(AggregateError);
});

it("前回中断の障害タグだけを回収し、通常の保留タグと版を残して初回保存する", async () => {
	vi.stubEnv(
		"CONNECTED_PREVIEW_ORIGIN",
		"https://pr-1171-evame-start.reimei.workers.dev",
	);
	const { createClient: createSqliteClient } =
		await vi.importActual<typeof import("@libsql/client")>("@libsql/client");
	const database = createSqliteClient({ url: "file::memory:" });
	try {
		await database.execute(
			"CREATE TABLE reader_cache_invalidations (tag TEXT PRIMARY KEY, version TEXT NOT NULL)",
		);
		for (const tag of ["reader:connected-purge-failure", "reader:pending"])
			await database.execute({
				sql: "INSERT INTO reader_cache_invalidations (tag,version) VALUES (?,?)",
				args: [tag, "previous-version"],
			});
		createClient.mockReturnValue({
			execute: (query: import("@libsql/client").InStatement) =>
				(typeof query === "string" ? query : query.sql).includes(
					"reader_cache_invalidations",
				)
					? database.execute(query)
					: Promise.resolve({ rows: [] }),
			close: vi.fn(),
		});
		readFile.mockResolvedValue(
			`"${"0".repeat(64)}": { functionName: "editPageContent_createServerFn_handler" }`,
		);
		const { readdir } = await import("node:fs/promises");
		vi.mocked(readdir).mockResolvedValue([
			"server-fn-resolver-test.js",
		] as never);
		const send = vi.fn(async () => {
			const pending = await database.execute(
				"SELECT tag,version FROM reader_cache_invalidations ORDER BY tag",
			);
			expect(
				pending.rows.map(({ tag, version }) => ({ tag, version })),
			).toEqual([{ tag: "reader:pending", version: "previous-version" }]);
			throw new Error("初回保存へ到達");
		});
		vi.stubGlobal("fetch", send);
		await expect(import("./check-reader-connected.mjs")).rejects.toThrow(
			"初回保存へ到達",
		);
		expect(send).toHaveBeenCalledOnce();
	} finally {
		database.close();
		vi.unstubAllGlobals();
	}
});

it("Cloudflare Previewでも差分なし保存で保留タグを回収する検証を実行する", async () => {
	vi.stubEnv(
		"CONNECTED_PREVIEW_ORIGIN",
		"https://pr-1170-evame-start.reimei.workers.dev",
	);
	vi.stubEnv("EVAME_CONNECTED_BROWSER", "");
	const execute = vi.fn().mockImplementation(async (query) => {
		const sql = typeof query === "string" ? query : query.sql;
		if (sql.startsWith("SELECT tag,version"))
			return { rows: [{ tag: "pending", version: "pending-version" }] };
		if (sql.startsWith("SELECT tag")) return { rows: [{ tag: "pending" }] };
		return {
			rows: [
				{ id: 7, mdast_json: "削除失敗後に回復する本文", updated_at: 123 },
			],
		};
	});
	createClient.mockReturnValue({ execute, close: vi.fn() });
	const resolver = [
		"editPageContent",
		"togglePublishAction",
		"archivePageAction",
	]
		.map(
			(name, index) =>
				`"${String(index).repeat(64)}": { functionName: "${name}_createServerFn_handler" }`,
		)
		.join(",");
	readFile.mockResolvedValue(resolver);
	const { readdir } = await import("node:fs/promises");
	vi.mocked(readdir).mockResolvedValue(["server-fn-resolver-test.js"] as never);
	let saves = 0;
	const send = vi.fn(async (url: string | URL | Request) => {
		const save = new URL(String(url)).pathname.includes(
			`/_serverFn/${"0".repeat(64)}`,
		);
		if (save) saves++;
		return new Response("保存応答の直後の本文", {
			status: save && saves === 3 ? 500 : 200,
			headers: { "X-Evame-HTML": "astro", "CF-Cache-Status": "HIT" },
		});
	});
	vi.stubGlobal("fetch", send);
	try {
		await expect(import("./check-reader-connected.mjs")).rejects.toThrow(
			"同内容の再保存で保留タグを回収する",
		);
		expect(
			execute.mock.calls.some(
				([query]) =>
					typeof query !== "string" &&
					query.sql.startsWith("INSERT INTO reader_cache_invalidations") &&
					query.args[0] === "reader:connected-purge-failure",
			),
		).toBe(true);
		expect(
			send.mock.calls.some(([url]) =>
				new URL(String(url)).pathname.startsWith("/__"),
			),
		).toBe(false);
	} finally {
		vi.unstubAllGlobals();
	}
});

it("ローカル接続検証ではコピーが完了してからHTTPサーバーを起動する", async () => {
	vi.stubEnv("CONNECTED_PREVIEW_ORIGIN", "");
	copyTestDatabase.mockRejectedValue(new Error("DBコピー失敗"));
	await expect(import("./check-reader-connected.mjs")).rejects.toThrow();
	expect(copyTestDatabase).toHaveBeenCalledOnce();
	expect(startTursoServer).not.toHaveBeenCalled();
	expect(createClient).not.toHaveBeenCalled();
});
