import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

// デプロイ前に参照アセットをR2へ保存し、旧HTMLからも取得できるようにする。
export async function prepareReaderStorage(configPath, preview) {
	const config = JSON.parse(await readFile(configPath, "utf8"));
	const bucket = (
		preview ? config.previews?.r2_buckets : config.r2_buckets
	)?.find((row) => row.binding === "PUBLIC_HTML")?.bucket_name;
	if (!config.account_id || !bucket)
		throw new Error("PUBLIC_HTML bucket and account are required");
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
	const credentials = process.env.CLOUDFLARE_API_TOKEN
		? { type: "api_token", token: process.env.CLOUDFLARE_API_TOKEN }
		: JSON.parse(
				execFileSync("bun", ["x", "wrangler", "auth", "token", "--json"], {
					encoding: "utf8",
					stdio: ["ignore", "pipe", "pipe"],
				}),
			);
	const authorization =
		credentials.type === "api_key"
			? { "X-Auth-Key": credentials.key, "X-Auth-Email": credentials.email }
			: { Authorization: `Bearer ${credentials.token}` };
	const endpoint =
		"https://api.cloudflare.com/client/v4/accounts/" +
		encodeURIComponent(config.account_id) +
		"/r2/buckets/" +
		encodeURIComponent(bucket) +
		"/objects/";
	for (let start = 0; start < files.length; start += 8) {
		const uploaded = await Promise.allSettled(
			files.slice(start, start + 8).map(async (entry) => {
				const path = join(entry.parentPath, entry.name);
				const key = `assets/_astro/${relative(directory, path).split("\\").join("/")}`;
				const response = await fetch(
					endpoint + key.split("/").map(encodeURIComponent).join("/"),
					{
						method: "PUT",
						headers: {
							...authorization,
							"Content-Type":
								types[extname(path)] ?? "application/octet-stream",
							"Cache-Control": "public, max-age=31536000, immutable",
						},
						body: await readFile(path),
					},
				);
				if (!response.ok)
					throw new Error(
						"R2 asset upload failed: " +
							key +
							" (HTTP " +
							response.status +
							")",
					);
				if ((await response.json()).success !== true)
					throw new Error(`R2 asset upload failed: ${key}`);
			}),
		);
		for (const result of uploaded)
			if (result.status === "rejected") throw result.reason;
	}
	console.log(`R2に公開アセット${files.length}件を保存しました: ${bucket}`);
}
