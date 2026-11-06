import { spawn } from "node:child_process";

for (const args of [
	["x", "astro", "build", "--root", "reader"],
	["x", "vite", "build", "--config", "vite.config.ts"],
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
