import {
	cp,
	mkdir,
	mkdtemp,
	readdir,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { join, relative } from "node:path";

const origin = new URL(process.argv[2]).origin;
const cacheDirectory = ".data/reader-assets";
const assetDirectory = "reader/dist/client/_astro";
await mkdir(cacheDirectory, { recursive: true });

// CIの履歴がない最初の切り替えでも、直前の公開HTMLと依存アセットを残す。
if ((await readdir(cacheDirectory)).length === 0) {
	const bootstrapDirectory = await mkdtemp(".data/reader-assets-bootstrap-");
	try {
		const homepage = new URL("/ja", origin).href;
		const pages = new Set([homepage, new URL("/ja/about", origin).href]);
		const assets = new Set();
		for (const page of pages) {
			const response = await fetch(page, { redirect: "error" });
			if (!response.ok) {
				if (page === homepage)
					throw new Error(
						`公開HTMLの取得に失敗しました: HTTP ${response.status}`,
					);
				continue;
			}
			const html = await response.text();
			for (const match of html.matchAll(
				/(?:component-url|renderer-url|href|src)="(\/_astro\/[A-Za-z0-9_.-]+)"/g,
			))
				assets.add(match[1]);
			if (page === homepage) {
				for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
					const url = new URL(match[1], page);
					if (
						url.origin === origin &&
						url.pathname.startsWith("/ja/") &&
						!url.pathname.endsWith("/edit") &&
						pages.size < 32
					)
						pages.add(url.href);
				}
			}
		}
		for (const path of assets) {
			const response = await fetch(new URL(path, origin), {
				redirect: "error",
			});
			if (!response.ok)
				throw new Error(
					`公開アセットの取得に失敗しました: HTTP ${response.status}`,
				);
			const body = Buffer.from(await response.arrayBuffer());
			await writeFile(
				join(bootstrapDirectory, path.slice("/_astro/".length)),
				body,
			);
			if (path.endsWith(".js") || path.endsWith(".css")) {
				for (const match of body
					.toString()
					.matchAll(
						/(?:\/_astro\/|\.\/)([A-Za-z0-9_.-]+\.[A-Za-z0-9_-]{8}\.(?:js|css|woff2?|svg|png|webp))/g,
					))
					assets.add(`/_astro/${match[1]}`);
			}
		}
		await rename(bootstrapDirectory, cacheDirectory);
	} finally {
		await rm(bootstrapDirectory, { recursive: true, force: true });
	}
}

await cp(assetDirectory, cacheDirectory, {
	recursive: true,
	preserveTimestamps: true,
});
const expiresBefore = Date.now() - 30 * 86400000;
for (const entry of await readdir(cacheDirectory, {
	recursive: true,
	withFileTypes: true,
})) {
	if (!entry.isFile()) continue;
	const path = join(entry.parentPath, entry.name);
	if ((await stat(path)).mtimeMs >= expiresBefore) continue;
	await rm(path);
	await rm(join(assetDirectory, relative(cacheDirectory, path)), {
		force: true,
	});
}
await cp(cacheDirectory, assetDirectory, {
	recursive: true,
	preserveTimestamps: true,
});
console.log("Readerの新旧アセットを30日間保持する準備が完了しました");
