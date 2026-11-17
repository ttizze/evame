// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
			account_id: "account",
			assets: { directory: "client" },
			r2_buckets: [{ binding: "PUBLIC_HTML", bucket_name: "production" }],
			previews: {
				r2_buckets: [{ binding: "PUBLIC_HTML", bucket_name: "preview" }],
			},
		}),
	);
	vi.stubEnv("CLOUDFLARE_API_TOKEN", "storage-token");
	vi.stubGlobal("fetch", request);
	request.mockReset().mockImplementation(
		async (_url, init) =>
			new Response(
				JSON.stringify({
					success: true,
					result:
						init?.method === "GET"
							? {
									rules: [
										{
											id: "html-expiry",
											enabled: true,
											conditions: { prefix: "html/" },
											deleteObjectsTransition: {
												condition: { type: "Age", maxAge: 172800 },
											},
										},
										{
											id: "index-expiry",
											enabled: true,
											conditions: { prefix: "dependencies/" },
											deleteObjectsTransition: {
												condition: { type: "Age", maxAge: 172800 },
											},
										},
										{
											id: "asset-expiry",
											enabled: true,
											conditions: { prefix: "assets/" },
											deleteObjectsTransition: {
												condition: { type: "Age", maxAge: 172800 },
											},
										},
										{
											id: "pending-expiry",
											enabled: true,
											conditions: { prefix: "pending/" },
											deleteObjectsTransition: {
												condition: { type: "Age", maxAge: 172800 },
											},
										},
										{
											id: "multipart",
											enabled: true,
											conditions: { prefix: "" },
											abortMultipartUploadsTransition: {
												condition: { maxAge: 604800, type: "Age" },
											},
										},
									],
								}
							: {},
				}),
			),
	);
});
afterEach(async () => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	await rm(directory, { recursive: true, force: true });
});
it.each([false, true])(
	"本番とPreviewのアセットをR2へ保存しHTMLと依存索引の自動削除を止める: %s",
	async (preview) => {
		await prepareReaderStorage(join(directory, "wrangler.json"), preview);
		const bucket = preview ? "preview" : "production";
		expect(
			request.mock.calls.every(([url]) =>
				String(url).includes("/buckets/" + bucket + "/"),
			),
		).toBe(true);
		const lifecycle = request.mock.calls.find(
			([url, init]) =>
				String(url).endsWith("/lifecycle") && init?.method === "PUT",
		);
		expect(
			JSON.parse(String(lifecycle?.[1]?.body)).rules.map(
				(row: { id: string }) => row.id,
			),
		).toEqual(["pending-expiry", "multipart"]);
		const assets = request.mock.calls.filter(([url]) =>
			String(url).includes("/objects/"),
		);
		expect(assets).toHaveLength(2);
		expect(
			assets.map(([url]) => String(url).split("/objects/")[1]).sort(),
		).toEqual([
			"assets/_astro/app.hash.js",
			"assets/_astro/nested/app.hash.css",
		]);
		for (const [url, init] of assets) {
			expect(init?.method).toBe("PUT");
			const headers = new Headers(init?.headers);
			expect(headers.get("Authorization")).toBe("Bearer storage-token");
			expect(headers.get("Cache-Control")).toContain("immutable");
			expect(headers.get("Content-Type")).toBe(
				String(url).endsWith(".js") ? "text/javascript" : "text/css",
			);
			expect(Buffer.from(init?.body as Uint8Array).toString()).toBe(
				String(url).endsWith(".js") ? "export {};" : "body{}",
			);
		}
	},
);
it("R2へのアセット保存失敗をデプロイ前に返す", async () => {
	request.mockImplementation(async (url) =>
		String(url).includes("/objects/")
			? new Response("private error", { status: 503 })
			: new Response(JSON.stringify({ success: true, result: { rules: [] } })),
	);
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("HTTP 503");
});
it("保持設定の読み取り失敗時はアセットをアップロードしない", async () => {
	request.mockResolvedValue(
		new Response(JSON.stringify({ success: false }), { status: 403 }),
	);
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("HTTP 403");
	expect(request).toHaveBeenCalledTimes(1);
});
it("広い削除ルールもHTMLへ適用せずmultipartの掃除は維持する", async () => {
	request.mockImplementation(
		async (_url, init) =>
			new Response(
				JSON.stringify({
					success: true,
					result:
						init?.method === "GET"
							? {
									rules: [
										{
											id: "all",
											enabled: true,
											conditions: { prefix: "" },
											deleteObjectsTransition: {
												condition: { type: "Age", maxAge: 1 },
											},
											abortMultipartUploadsTransition: {
												condition: { maxAge: 604800, type: "Age" },
											},
										},
									],
								}
							: {},
				}),
			),
	);
	await prepareReaderStorage(join(directory, "wrangler.json"), false);
	const update = request.mock.calls.find(
		([, init]) => init?.method === "PUT" && typeof init.body === "string",
	);
	expect(JSON.parse(String(update?.[1]?.body)).rules).toEqual([
		{
			id: "all",
			enabled: true,
			conditions: { prefix: "" },
			abortMultipartUploadsTransition: {
				condition: { maxAge: 604800, type: "Age" },
			},
		},
	]);
});
it("アセットが空ならデプロイ準備に成功しない", async () => {
	await rm(join(directory, "client/_astro"), { recursive: true });
	await mkdir(join(directory, "client/_astro"));
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("Astro assets are missing");
	expect(request).not.toHaveBeenCalled();
});
