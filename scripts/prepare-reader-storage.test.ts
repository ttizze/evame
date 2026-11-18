// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { prepareReaderStorage } from "./prepare-reader-storage.mjs";

vi.mock("wrangler", () => ({ getPlatformProxy: vi.fn() }));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

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
	vi.mocked(getPlatformProxy).mockReset();
	vi.mocked(execFileSync).mockReset();
	vi.stubEnv("CLOUDFLARE_API_TOKEN", "storage-token");
	vi.stubGlobal("fetch", request);
	request
		.mockReset()
		.mockImplementation(async () => Response.json({ success: true }));
});
afterEach(async () => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	await rm(directory, { recursive: true, force: true });
});

it.each([false, true])(
	"本番とPreviewのアセットを開発セッションなしで専用バケットへ保存する: %s",
	async (preview) => {
		await prepareReaderStorage(join(directory, "wrangler.json"), preview);
		const endpoint =
			"https://api.cloudflare.com/client/v4/accounts/account/r2/buckets/" +
			(preview ? "preview" : "production") +
			"/objects/";
		expect(getPlatformProxy).not.toHaveBeenCalled();
		expect(execFileSync).not.toHaveBeenCalled();
		expect(request).toHaveBeenCalledTimes(2);
		expect(request.mock.calls.map(([url]) => url).sort()).toEqual([
			`${endpoint}assets/_astro/app.hash.js`,
			`${endpoint}assets/_astro/nested/app.hash.css`,
		]);
		for (const [url, options] of request.mock.calls) {
			const headers = new Headers(options?.headers);
			expect(options?.method).toBe("PUT");
			expect(headers.get("Authorization")).toBe("Bearer storage-token");
			expect(headers.get("Cache-Control")).toBe(
				"public, max-age=31536000, immutable",
			);
			expect(headers.get("Content-Type")).toBe(
				String(url).endsWith(".js") ? "text/javascript" : "text/css",
			);
			expect(options?.body).toEqual(
				Buffer.from(String(url).endsWith(".js") ? "export {};" : "body{}"),
			);
		}
	},
);
it.each([false, true])(
	"R2 APIが403ならデプロイ前に失敗を返す: %s",
	async (preview) => {
		request.mockImplementation(async () =>
			Response.json({ success: false }, { status: 403 }),
		);
		await expect(
			prepareReaderStorage(join(directory, "wrangler.json"), preview),
		).rejects.toThrow("HTTP 403");
	},
);
it("HTTP成功でもR2 APIが失敗を返したら公開を止める", async () => {
	request.mockImplementation(async () => Response.json({ success: false }));
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("R2 asset upload failed");
});
it("R2の通信失敗を隠さず公開を止める", async () => {
	request.mockRejectedValue(new Error("R2 connection failed"));
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("R2 connection failed");
});
it("アセットが空ならアップロードも認証取得もしない", async () => {
	await rm(join(directory, "client/_astro"), { recursive: true });
	await mkdir(join(directory, "client/_astro"));
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("Astro assets are missing");
	expect(request).not.toHaveBeenCalled();
	expect(execFileSync).not.toHaveBeenCalled();
});
it.each(["_..hash.css", "app #%.css", "日本語.css"])(
	"アセット名%sを変えずに保存し、スラッシュ以外の予約文字をエンコードする",
	async (filename) => {
		await writeFile(join(directory, "client/_astro", filename), "special{}");
		await prepareReaderStorage(join(directory, "wrangler.json"), false);
		expect(request).toHaveBeenCalledWith(
			"https://api.cloudflare.com/client/v4/accounts/account/r2/buckets/production/objects/assets/_astro/" +
				encodeURIComponent(filename),
			expect.objectContaining({ body: Buffer.from("special{}") }),
		);
	},
);
it("APIトークン未指定でも既存のCLI認証でR2へ保存できる", async () => {
	vi.stubEnv("CLOUDFLARE_API_TOKEN", undefined);
	vi.mocked(execFileSync).mockReturnValue(
		JSON.stringify({ type: "oauth", token: "existing-cli-token" }),
	);
	await prepareReaderStorage(join(directory, "wrangler.json"), false);
	expect(execFileSync).toHaveBeenCalledOnce();
	expect(execFileSync).toHaveBeenCalledWith(
		"bun",
		["x", "wrangler", "auth", "token", "--json"],
		expect.objectContaining({
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}),
	);
	expect(request).toHaveBeenCalledTimes(2);
	for (const [, options] of request.mock.calls)
		expect(new Headers(options?.headers).get("Authorization")).toBe(
			"Bearer existing-cli-token",
		);
	expect(getPlatformProxy).not.toHaveBeenCalled();
});
it("既存CLIのAPIキー認証も維持する", async () => {
	vi.stubEnv("CLOUDFLARE_API_TOKEN", undefined);
	vi.mocked(execFileSync).mockReturnValue(
		JSON.stringify({
			type: "api_key",
			key: "existing-key",
			email: "user@example.com",
		}),
	);
	await prepareReaderStorage(join(directory, "wrangler.json"), false);
	expect(request).toHaveBeenCalledTimes(2);
	for (const [, options] of request.mock.calls) {
		const headers = new Headers(options?.headers);
		expect(headers.get("X-Auth-Key")).toBe("existing-key");
		expect(headers.get("X-Auth-Email")).toBe("user@example.com");
		expect(headers.has("Authorization")).toBe(false);
	}
});
it("CLI認証が使えない場合はログインを開始せずアップロード前に止める", async () => {
	vi.stubEnv("CLOUDFLARE_API_TOKEN", undefined);
	vi.mocked(execFileSync).mockImplementation(() => {
		throw new Error("Not logged in");
	});
	await expect(
		prepareReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("Not logged in");
	expect(request).not.toHaveBeenCalled();
});
it("Previewバケットがなければ本番へフォールバックしない", async () => {
	const configPath = join(directory, "wrangler.json");
	const config = JSON.parse(await readFile(configPath, "utf8"));
	delete config.previews;
	await writeFile(configPath, JSON.stringify(config));
	await expect(prepareReaderStorage(configPath, true)).rejects.toThrow(
		"PUBLIC_HTML bucket and account are required",
	);
	expect(request).not.toHaveBeenCalled();
});
it("R2保存は最大8件を並列実行し、全件の完了を待つ", async () => {
	for (let index = 0; index < 17; index++)
		await writeFile(
			join(directory, `client/_astro/asset-${index}.js`),
			"asset",
		);
	let pending = 0;
	let maximum = 0;
	const waiting: (() => void)[] = [];
	request.mockImplementation(async () => {
		pending++;
		maximum = Math.max(maximum, pending);
		await new Promise<void>((resolve) => {
			waiting.push(resolve);
			if (
				request.mock.calls.length % 8 === 0 ||
				request.mock.calls.length === 19
			)
				for (const release of waiting.splice(0)) release();
		});
		pending--;
		return Response.json({ success: true });
	});
	await prepareReaderStorage(join(directory, "wrangler.json"), false);
	expect(request).toHaveBeenCalledTimes(19);
	expect(maximum).toBe(8);
	expect(pending).toBe(0);
});
it("並列アップロードの失敗時も開始済みの処理を待ち、次の組を開始しない", async () => {
	for (let index = 0; index < 9; index++)
		await writeFile(
			join(directory, `client/_astro/asset-${index}.js`),
			"asset",
		);
	let completed = 0;
	let releaseUploads!: () => void;
	const pendingUploads = new Promise<void>((resolve) => {
		releaseUploads = resolve;
	});
	request.mockImplementation(async (url) => {
		if (!String(url).endsWith("app.hash.js")) await pendingUploads;
		completed++;
		return Response.json({ success: !String(url).endsWith("app.hash.js") });
	});
	const uploading = prepareReaderStorage(
		join(directory, "wrangler.json"),
		false,
	);
	let settled = false;
	void uploading.then(
		() => {
			settled = true;
		},
		() => {
			settled = true;
		},
	);
	const rejected = expect(uploading).rejects.toThrow("R2 asset upload failed");
	await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(8));
	await new Promise<void>((resolve) => setImmediate(resolve));
	expect(settled).toBe(false);
	expect(completed).toBe(1);
	releaseUploads();
	await rejected;
	expect(request).toHaveBeenCalledTimes(8);
	expect(completed).toBe(8);
});
