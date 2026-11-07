import { execFileSync } from "node:child_process";
import { readFile, rename, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

const nextPath = ".data/reader-assets/next.json";
const next = JSON.parse(await readFile(nextPath, "utf8"));
if (!Array.isArray(next.active) || !Array.isArray(next.retiring))
	throw new Error("prepare:reader-assetsで配信アセットを準備してください");

for (const config of [
	"reader/dist/server/wrangler.json",
	"dist/server/wrangler.json",
])
	execFileSync("bun", ["x", "wrangler", "deploy", "--config", config], {
		stdio: "inherit",
	});

const now = new Date();
for (const path of next.retiring)
	await utimes(join(".data/reader-assets/files", path), now, now);
await writeFile(nextPath, JSON.stringify(next.active));
await rename(nextPath, ".data/reader-assets/active.json");

// コード変更でキャッシュ済みHTMLと表示がずれないようReader自身で無効化する。
execFileSync(process.execPath, ["scripts/purge-reader-cache.mjs"], {
	stdio: "inherit",
});
