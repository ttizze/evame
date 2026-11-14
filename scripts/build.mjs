import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

for (const args of [
	["x", "astro", "build", "--root", "reader"],
	["x", "vite", "build", "--config", "vite.config.ts"],
	[
		"x",
		"wrangler",
		"deploy",
		"--dry-run",
		"--config",
		"gateway/wrangler.jsonc",
		"--outdir",
		"dist",
		"--metafile",
		"gateway/dist/bundle-meta.json",
		"--minify",
	],
]) {
	const child = spawn("bun", args, {
		stdio: "inherit",
		env: { ...process.env, CLOUDFLARE_INCLUDE_PROCESS_ENV: "true" },
	});
	const code = await new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code) => resolve(code ?? 1));
	});
	if (code !== 0) process.exit(code);
}

// CIとローカル検証・公開で、同じビルド済みGatewayを使う。
const gateway = JSON.parse(await readFile("gateway/wrangler.jsonc", "utf8"));
await writeFile(
	"gateway/dist/wrangler.json",
	JSON.stringify({ ...gateway, main: "worker.js", no_bundle: true }),
);
