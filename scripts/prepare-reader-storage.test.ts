// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";

vi.mock("wrangler", () => ({ getPlatformProxy: vi.fn() }));
const put = vi.fn();
const dispose = vi.fn();
let proxyConfig: Record<string, unknown>;

import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

let directory: string;
const request = vi.fn<typeof fetch>();
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "reader-storage-"));
	await mkdir(join(directory, "client/_astro/nested"), { recursive: true });
	await writeFile(join(directory, "client/_astro/app.hash.js"), "export {};");
	await writeFile(
		join(directory, "client/_astro/nested/app.hash.css"),
		"body{}",
	);
	await writeFile(
		join(directory, "wrangler.json"),
		JSON.stringify({
			name: "evame-start",
			compatibility_date: "2026-11-01",
			account_id: "account",
			assets: { directory: "client" },
			r2_buckets: [{ binding: "PUBLIC_HTML", bucket_name: "production" }],
			previews: {
				r2_buckets: [{ binding: "PUBLIC_HTML", bucket_name: "preview" }],
			},
		}),
	);
	put.mockReset().mockResolvedValue({});
	dispose.mockReset().mockResolvedValue(undefined);
	vi.mocked(getPlatformProxy)
		.mockReset()
		.mockImplementation(async (options) => {
			proxyConfig = JSON.parse(await readFile(options!.configPath!, "utf8"));
			return { env: { PUBLIC_HTML: { put } }, dispose } as never;
		});
	vi.stubEnv("CLOUDFLARE_API_TOKEN", "storage-token");
	vi.stubGlobal("fetch", request);
	request.mockReset();
});
afterEach(async () => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	await rm(directory, { recursive: true, force: true });
});
it.each([false, true])(
	"通常デプロイでは本番とPreviewのアセットをR2 bindingへ保存する: %s",
	async (preview) => {
		await prepareReaderStorage(join(directory, "wrangler.json"), preview);
		const bucket = preview ? "preview" : "production";
		expect(request).not.toHaveBeenCalled();
		expect(proxyConfig.r2_buckets).toEqual([
			{
				binding: "PUBLIC_HTML",
				bucket_name: bucket,
				remote: true,
			},
		]);
		expect(put).toHaveBeenCalledTimes(2);
		expect(put.mock.calls.map(([key]) => key).sort()).toEqual([
			"assets/_astro/app.hash.js",
			"assets/_astro/nested/app.hash.css",
		]);
		for (const [key, body, options] of put.mock.calls) {
			expect(options.httpMetadata.cacheControl).toContain("immutable");
			expect(options.httpMetadata.contentType).toBe(
				key.endsWith(".js") ? "text/javascript" : "text/css",
			);
			expect(Buffer.from(body).toString()).toBe(
				key.endsWith(".js") ? "export {};" : "body{}",
			);
		}
		expect(dispose).toHaveBeenCalledOnce();
	},
);
it("R2へのアセット保存失敗をデプロイ前に返す", async () => {
	put.mockRejectedValue(new Error("R2 write failed"));
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("R2 write failed");
	expect(dispose).toHaveBeenCalledOnce();
});
it("アセットが空ならデプロイ準備に成功しない", async () => {
	await rm(join(directory, "client/_astro"), { recursive: true });
	await mkdir(join(directory, "client/_astro"));
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("Astro assets are missing");
	expect(request).not.toHaveBeenCalled();
});

it("連続ドットを含むアセット名をR2 bindingでそのまま保存する", async () => {
	await writeFile(join(directory, "client/_astro/_..hash.css"), "special{}");
	await prepareReaderStorage(join(directory, "wrangler.json"), false);
	expect(put).toHaveBeenCalledWith(
		"assets/_astro/_..hash.css",
		Buffer.from("special{}"),
		expect.objectContaining({
			httpMetadata: expect.objectContaining({ contentType: "text/css" }),
		}),
	);
	expect(request).not.toHaveBeenCalled();
});
