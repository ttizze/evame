// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prepareReaderConnected } from "./prepare-reader-connected.mjs";

vi.mock("cloudflare:workers", () => ({
	WorkerEntrypoint: class {},
}));

let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-connected-fixture-"));
	await mkdir(join(directory, "assets"));
	await writeFile(
		join(directory, "wrangler.json"),
		JSON.stringify({
			main: "index.mjs",
			assets: { directory: "../client" },
			exports: { PublicPages: { type: "worker" } },
		}),
	);
	await writeFile(
		join(directory, "index.mjs"),
		`export default {}; class ApplicationPublicPages { async publish(changes) { return changes; } async fetch() { return new Response("古い公開本文"); } } export const PublicPages = new Proxy(ApplicationPublicPages, {construct(target, args) { return new target(...args); }});`,
	);
	await writeFile(
		join(directory, "assets/db-test.mjs"),
		`const database = {createDb() { throw new Error("不要なDB接続"); }}; export {database as t};`,
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("本番成果物を保ち検証専用entrypointだけを差し替える", async () => {
	const original = await readFile(join(directory, "index.mjs"), "utf8");
	const configPath = await prepareReaderConnected(directory);
	const config = JSON.parse(await readFile(configPath, "utf8"));
	expect(config.main).toBe("connected-worker.mjs");
	expect(config.assets.directory).toBe("../client");
	expect(config.exports.PublicPages).toEqual({ type: "worker" });
	expect(await readFile(join(directory, "index.mjs"), "utf8")).toBe(original);
});

it("Previewの公開シグナルが違うリクエストはアプリの処理へ渡さない", async () => {
	const signal = "a".repeat(40);
	const origin = "https://pr-1175-evame-start.reimei.workers.dev";
	const headers = { "x-evame-preview-signal": signal };
	await writeFile(
		join(directory, "index.mjs"),
		`
export default { async fetch() { return new Response("app", {status: 201}); } };
export class PublicPages {}`,
	);
	await prepareReaderConnected(directory, signal);
	const { default: worker } = await import(
		pathToFileURL(join(directory, "connected-worker.mjs")).href
	);
	const marker = await worker.fetch(
		new Request(`${origin}/evame-preview-signal.txt`),
	);
	expect(await marker.text()).toBe(`${signal}\n`);
	expect(marker.headers.get("Cache-Control")).toBe("no-store");
	const stale = await worker.fetch(
		new Request(`${origin}/api`, {
			method: "POST",
			headers: { "x-evame-preview-signal": "b".repeat(40) },
		}),
	);
	expect(stale.status).toBe(409);
	expect(stale.headers.get("x-evame-preview-signal")).toBe(signal);
	const current = await worker.fetch(
		new Request(`${origin}/api`, { method: "POST", headers }),
	);
	expect(current.status).toBe(201);
	expect(current.headers.get("x-evame-preview-signal")).toBe(signal);
	expect(await current.text()).toBe("app");
});

it("配信シグナルを指定した保存が例外で失敗しても同じPreviewの500として確認できる", async () => {
	const signal = "a".repeat(40);
	await writeFile(
		join(directory, "index.mjs"),
		`export default { async fetch() { throw new Error("R2への反映に失敗"); } };
export class PublicPages {}`,
	);
	await prepareReaderConnected(directory, signal);
	const { default: worker } = await import(
		pathToFileURL(join(directory, "connected-worker.mjs")).href
	);
	const url = "https://pr-1175-evame-start.reimei.workers.dev/api";
	const log = vi.spyOn(console, "error").mockImplementation(() => {});
	try {
		const response = await worker.fetch(
			new Request(url, {
				method: "POST",
				headers: { "x-evame-preview-signal": signal },
			}),
		);
		expect(response.status).toBe(500);
		expect(response.headers.get("x-evame-preview-signal")).toBe(signal);
		expect(log).toHaveBeenCalledOnce();
		await expect(worker.fetch(new Request(url))).rejects.toThrow(
			"R2への反映に失敗",
		);
	} finally {
		log.mockRestore();
	}
});

it("保留中の検証キーでR2反映を失敗させ、解除後は実entrypointを呼ぶ", async () => {
	await prepareReaderConnected(directory);
	const { PublicPages } = await import(
		pathToFileURL(join(directory, "connected-worker.mjs")).href
	);
	const entry = new PublicPages();
	await expect(
		entry.publish([
			{ key: "page:1", revision: 1 },
			{ key: "connected:publication-failure", revision: 1 },
		]),
	).rejects.toThrow("Injected public HTML publication failure");
	await expect(
		entry.publish([{ key: "page:1", revision: 1 }]),
	).resolves.toEqual([{ key: "page:1", revision: 1 }]);
});

it.each(["namespace", "direct"])(
	"DBの%s exportをProxyへ触れずに選び、接続検証の待機を解除する",
	async (shape) => {
		await writeFile(
			join(directory, "assets/db-test.mjs"),
			`const db = new Proxy({}, {get() { throw new Error("DBのProxyへ触れた"); }}); function createDb() { return {updateTable() { return {set() { return this; }, where() { return this; }, async execute() {} }; }, selectFrom() { return {select() { return this; }, where() { return this; }, async executeTakeFirst() { return {state:"released"}; } }; }, async destroy() {}}; } ${shape === "namespace" ? "const a = {get createDb() { return createDb; }}; export {db as a, a as r};" : "export {db as a, createDb};"}`,
		);
		await prepareReaderConnected(directory);
		const { PublicPages } = await import(
			pathToFileURL(join(directory, "connected-worker.mjs")).href
		);
		const response = await new PublicPages().fetch(
			new Request("https://evame.test/ja", {
				headers: {
					"X-Evame-Connected-Hold": "00000000-0000-0000-0000-000000000000",
				},
			}),
		);
		expect(await response.text()).toBe("古い公開本文");
	},
);

it("DBファクトリがない場合はProxyへの接続を試さず明示的に停止する", async () => {
	await writeFile(
		join(directory, "assets/db-test.mjs"),
		`export const db = new Proxy({}, {get() { throw new Error("DBのProxyへ触れた"); }});`,
	);
	await prepareReaderConnected(directory);
	await expect(
		import(pathToFileURL(join(directory, "connected-worker.mjs")).href),
	).rejects.toThrow("Built database factory export is required");
});
