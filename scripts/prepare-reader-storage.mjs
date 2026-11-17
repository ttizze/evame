import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

// 本番デプロイと標準Previewの両方で、公開HTMLとその参照先を同じ寿命に揃える。
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
	const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}/r2/buckets/${bucket}`;
	const authorization = { Authorization: `Bearer ${token}` };
	const current = await fetch(endpoint + "/lifecycle", {
		method: "GET",
		headers: authorization,
	});
	if (!current.ok)
		throw new Error(`R2 lifecycle read failed: HTTP ${current.status}`);
	const lifecycle = await current.json();
	if (!lifecycle.success || !Array.isArray(lifecycle.result?.rules))
		throw new Error("Invalid R2 lifecycle response");
	const rules = lifecycle.result.rules.flatMap((rule) => {
		const prefix = rule.conditions?.prefix ?? "";
		if (
			!["html/", "dependencies/", "assets/"].some(
				(retained) =>
					retained.startsWith(prefix) || prefix.startsWith(retained),
			)
		)
			return [rule];
		const { deleteObjectsTransition, ...retained } = rule;
		return retained.abortMultipartUploadsTransition ||
			retained.storageClassTransitions?.length
			? [retained]
			: [];
	});
	if (JSON.stringify(rules) !== JSON.stringify(lifecycle.result.rules)) {
		const updated = await fetch(endpoint + "/lifecycle", {
			method: "PUT",
			headers: { ...authorization, "Content-Type": "application/json" },
			body: JSON.stringify({ rules }),
		});
		if (!updated.ok)
			throw new Error(`R2 lifecycle update failed: HTTP ${updated.status}`);
		if (!(await updated.json()).success)
			throw new Error("R2 lifecycle update failed");
	}
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
	for (let start = 0; start < files.length; start += 8) {
		const uploaded = await Promise.allSettled(
			files.slice(start, start + 8).map(async (entry) => {
				const path = join(entry.parentPath, entry.name);
				const key =
					"assets/_astro/" + relative(directory, path).split("\\").join("/");
				const result = await fetch(endpoint + "/objects/" + key, {
					method: "PUT",
					headers: {
						...authorization,
						"Content-Type": types[extname(path)] ?? "application/octet-stream",
						"Cache-Control": "public, max-age=31536000, immutable",
					},
					body: await readFile(path),
				});
				if (!result.ok)
					throw new Error(
						`R2 asset upload failed: ${key}, HTTP ${result.status}`,
					);
				await result.body?.cancel();
			}),
		);
		for (const result of uploaded)
			if (result.status === "rejected") throw result.reason;
	}
	console.log(`R2に公開アセット${files.length}件を保存しました: ${bucket}`);
}
