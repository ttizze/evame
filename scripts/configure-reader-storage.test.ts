// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureReaderStorage } from "./configure-reader-storage.mjs";

let directory: string;
const request = vi.fn<typeof fetch>();
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "reader-storage-config-"));
	await writeFile(
		join(directory, "wrangler.json"),
		JSON.stringify({
			account_id: "account",
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
	"初期設定で本番とPreviewの公開HTML・依存索引・アセットの削除を止める: %s",
	async (preview) => {
		await configureReaderStorage(join(directory, "wrangler.json"), preview);
		expect(
			request.mock.calls.every(([url]) =>
				String(url).includes(`/buckets/${preview ? "preview" : "production"}/`),
			),
		).toBe(true);
		const update = request.mock.calls.find(
			([, init]) => init?.method === "PUT",
		);
		expect(
			JSON.parse(String(update?.[1]?.body)).rules.map(
				(row: { id: string }) => row.id,
			),
		).toEqual(["pending-expiry", "multipart", "reader-expire-changes"]);
	},
);
it("保持設定の読み取り失敗を返す", async () => {
	request.mockResolvedValue(
		new Response(JSON.stringify({ success: false }), { status: 403 }),
	);
	await expect(
		configureReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("HTTP 403");
	expect(request).toHaveBeenCalledTimes(1);
});
it("広い削除ルールを外しても変更記録と保留マーカーは2日で掃除する", async () => {
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
	await configureReaderStorage(join(directory, "wrangler.json"), false);
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
		...(["changes/", "pending/"] as const).map((prefix) => ({
			id: `reader-expire-${prefix.slice(0, -1)}`,
			enabled: true,
			conditions: { prefix },
			deleteObjectsTransition: {
				condition: { type: "Age", maxAge: 172800 },
			},
		})),
	]);
});

it("保持設定済みならバケットの設定を書き換えない", async () => {
	const rules = [
		...(["changes/", "pending/"] as const).map((prefix) => ({
			id: prefix,
			enabled: true,
			conditions: { prefix },
			deleteObjectsTransition: { condition: { type: "Age", maxAge: 172800 } },
		})),
	];
	request.mockResolvedValue(
		new Response(JSON.stringify({ success: true, result: { rules } })),
	);
	await configureReaderStorage(join(directory, "wrangler.json"), false);
	expect(request).toHaveBeenCalledTimes(1);
});
it("保持設定の更新失敗を成功として返さない", async () => {
	request
		.mockImplementationOnce(
			async () =>
				new Response(JSON.stringify({ success: true, result: { rules: [] } })),
		)
		.mockResolvedValueOnce(new Response(null, { status: 403 }));
	await expect(
		configureReaderStorage(join(directory, "wrangler.json"), false),
	).rejects.toThrow("HTTP 403");
});
