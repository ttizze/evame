import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const env = {
	...process.env,
	CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
	CLOUDFLARE_DEV_REGISTRY_PATH: resolve(".wrangler/registry"),
	SENTRY_DSN: "",
	VITE_SENTRY_DSN: "",
};
const build = spawn("bun", ["x", "astro", "build", "--root", "reader"], {
	env,
	stdio: "inherit",
});
const buildCode = await new Promise((resolve, reject) => {
	build.once("error", reject);
	build.once("exit", resolve);
});
if (buildCode !== 0) process.exit(buildCode ?? 1);
await rm(".data/dev-public", { recursive: true, force: true });
await cp("public", ".data/dev-public", { recursive: true });
await cp("reader/dist/client", ".data/dev-public", { recursive: true });
const child = spawn(
	"bun",
	[
		"x",
		"vite",
		"dev",
		"--config",
		"vite.config.ts",
		"--port",
		"3000",
		...process.argv.slice(2),
	],
	{ env, stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
	process.once(signal, () => child.kill(signal));
process.exitCode = await new Promise((resolve, reject) => {
	child.once("error", reject);
	child.once("exit", (code) => resolve(code ?? 1));
});
