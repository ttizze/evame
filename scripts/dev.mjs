import { spawn } from "node:child_process";
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
const children = [
	[
		"x",
		"wrangler",
		"dev",
		"--config",
		"reader/dist/server/wrangler.json",
		"--port",
		"3001",
	],
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
].map((args) => spawn("bun", args, { env, stdio: "inherit" }));
for (const signal of ["SIGINT", "SIGTERM"])
	process.once(signal, () => {
		for (const child of children) child.kill(signal);
	});
try {
	const codes = await Promise.all(
		children.map(
			(child) =>
				new Promise((resolve, reject) => {
					child.once("error", reject);
					child.once("exit", (code) => {
						for (const other of children) if (other !== child) other.kill();
						resolve(code);
					});
				}),
		),
	);
	process.exitCode = codes.find((code) => code !== null && code !== 0) ?? 0;
} finally {
	for (const child of children) child.kill();
}
