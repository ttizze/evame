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
			exports: { PublicPages: { type: "worker", cache: { enabled: true } } },
		}),
	);
	await writeFile(
		join(directory, "index.mjs"),
		`export default {}; class ApplicationPublicPages { async purge(tags) { return tags; } async fetch() { return new Response("古い公開本文"); } } export const PublicPages = new Proxy(ApplicationPublicPages, {construct(target, args) { return new target(...args); }});`,
	);
	await writeFile(
		join(directory, "assets/db-test.mjs"),
		`function createDb() { throw new Error("不要なDB接続"); } export {createDb as t};`,
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("本番成果物を保ち検証専用entrypointだけを差し替える", async () => {
	const original = await readFile(join(directory, "index.mjs"), "utf8");
	const configPath = await prepareReaderConnected(directory);
	const config = JSON.parse(await readFile(configPath, "utf8"));
	expect(config.main).toBe("connected-worker.mjs");
	expect(config.assets.directory).toBe("../client");
	expect(config.exports.PublicPages.cache.enabled).toBe(true);
	expect(await readFile(join(directory, "index.mjs"), "utf8")).toBe(original);
});

it("保留中の検証タグでpurgeを失敗させ、解除後は実entrypointを呼ぶ", async () => {
	await prepareReaderConnected(directory);
	const { PublicPages } = await import(
		pathToFileURL(join(directory, "connected-worker.mjs")).href
	);
	const entry = new PublicPages();
	await expect(
		entry.purge(["reader:page", "reader:connected-purge-failure"]),
	).rejects.toThrow("Injected public HTML cache invalidation failure");
	await expect(entry.purge(["reader:page"])).resolves.toEqual(["reader:page"]);
});
