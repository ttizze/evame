import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { getPlatformProxy } from "wrangler";

// デプロイ前に参照アセットをR2へ保存し、旧HTMLからも取得できるようにする。
export async function prepareReaderStorage(configPath, preview) {
	const config = JSON.parse(await readFile(configPath, "utf8"));
	const bucket = (
		preview ? config.previews?.r2_buckets : config.r2_buckets
	)?.find((row) => row.binding === "PUBLIC_HTML")?.bucket_name;
	const token = process.env.CLOUDFLARE_API_TOKEN;
	if (!config.account_id || !bucket || !token)
		throw new Error(
			"PUBLIC_HTML bucket, account and CLOUDFLARE_API_TOKEN are required",
		);
	const directory = resolve(
		dirname(configPath),
		config.assets.directory,
		"_astro",
	);
	const files = (
		await readdir(directory, { recursive: true, withFileTypes: true })
	).filter((entry) => entry.isFile());
	if (!files.length) throw new Error("Astro assets are missing");
	const types = {
		".js": "text/javascript",
		".css": "text/css",
		".json": "application/json",
		".map": "application/json",
		".wasm": "application/wasm",
		".woff": "font/woff",
		".woff2": "font/woff2",
		".ttf": "font/ttf",
		".otf": "font/otf",
		".svg": "image/svg+xml",
		".png": "image/png",
		".webp": "image/webp",
		".avif": "image/avif",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".ico": "image/x-icon",
	};
	const temporary = await mkdtemp(join(tmpdir(), "reader-assets-"));
	try {
		const proxyConfigPath = join(temporary, "wrangler.json");
		await writeFile(
			proxyConfigPath,
			JSON.stringify({
				name: config.name,
				account_id: config.account_id,
				compatibility_date: config.compatibility_date,
				r2_buckets: [
					{ binding: "PUBLIC_HTML", bucket_name: bucket, remote: true },
				],
			}),
		);
		const proxy = await getPlatformProxy({
			configPath: proxyConfigPath,
			persist: false,
		});
		try {
			for (let start = 0; start < files.length; start += 8) {
				const uploaded = await Promise.allSettled(
					files.slice(start, start + 8).map(async (entry) => {
						const path = join(entry.parentPath, entry.name);
						const key =
							"assets/_astro/" +
							relative(directory, path).split("\\").join("/");
						await proxy.env.PUBLIC_HTML.put(key, await readFile(path), {
							httpMetadata: {
								contentType: types[extname(path)] ?? "application/octet-stream",
								cacheControl: "public, max-age=31536000, immutable",
							},
						});
					}),
				);
				for (const result of uploaded)
					if (result.status === "rejected") throw result.reason;
			}
		} finally {
			await proxy.dispose();
		}
	} finally {
		await rm(temporary, { recursive: true, force: true });
	}
	console.log(`R2に公開アセット${files.length}件を保存しました: ${bucket}`);
}
