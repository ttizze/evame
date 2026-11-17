// @vitest-environment node
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(new URL("./deploy-workers.mjs", import.meta.url));
let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-deploy-workers-"));
	await mkdir(join(directory, "dist/server"), { recursive: true });
	await mkdir(join(directory, "dist/client/_astro"), { recursive: true });
	await mkdir(join(directory, "bin"));
	await writeFile(
		join(directory, "dist/client/_astro/app.hash.js"),
		"export {};",
	);
	await writeFile(
		join(directory, "dist/server/wrangler.json"),
		JSON.stringify({
			account_id: "account",
			assets: { directory: "../client" },
			r2_buckets: [{ binding: "PUBLIC_HTML", bucket_name: "production" }],
		}),
	);
	await writeFile(
		join(directory, "fake-fetch.mjs"),
		'import { registerHooks } from "node:module";\nregisterHooks({resolve(specifier,context,nextResolve){\n if(specifier === "wrangler") return {url:new URL("./fake-wrangler.mjs",import.meta.url).href,shortCircuit:true};\n return nextResolve(specifier,context);\n}});',
	);
	await writeFile(
		join(directory, "fake-wrangler.mjs"),
		'import { appendFile, readFile } from "node:fs/promises";\nimport { existsSync } from "node:fs";\nexport async function getPlatformProxy({configPath}) {\n const config=JSON.parse(await readFile(configPath,"utf8"));\n return {env:{PUBLIC_HTML:{async put(key){\n await appendFile("calls","R2 "+config.r2_buckets[0].bucket_name+" PUT "+key+"\\n");\n if(existsSync("fail-assets"))throw new Error("R2 asset upload failed");\n }}},async dispose(){await appendFile("calls","R2 dispose\\n");}};\n}',
	);
	await writeFile(
		join(directory, "bin/bun"),
		'#!/bin/sh\nprintf "%s\\n" "$*" >> calls\nif test -f fail-worker; then exit 1; fi\n',
		{ mode: 0o755 },
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("公開アセットをR2へ保存してから統合Workerを一度だけ更新する", async () => {
	await promisify(execFile)(
		process.execPath,
		["--import", join(directory, "fake-fetch.mjs"), script],
		{
			cwd: directory,
			env: {
				...process.env,
				CLOUDFLARE_API_TOKEN: "storage-token",
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		},
	);
	expect(
		(await readFile(join(directory, "calls"), "utf8")).trim().split("\n"),
	).toEqual([
		"R2 production PUT assets/_astro/app.hash.js",
		"R2 dispose",
		"x wrangler deploy --config dist/server/wrangler.json",
	]);
});
it("R2へのアセット保存に失敗したらWorkerを更新しない", async () => {
	await writeFile(join(directory, "fail-assets"), "");
	await expect(
		promisify(execFile)(
			process.execPath,
			["--import", join(directory, "fake-fetch.mjs"), script],
			{
				cwd: directory,
				env: {
					...process.env,
					CLOUDFLARE_API_TOKEN: "storage-token",
					PATH: `${join(directory, "bin")}:${process.env.PATH}`,
				},
			},
		),
	).rejects.toThrow("R2 asset upload failed");
	expect(await readFile(join(directory, "calls"), "utf8")).not.toContain(
		"wrangler deploy",
	);
});
it("統合Workerの更新に失敗した場合も成功として返さない", async () => {
	await writeFile(join(directory, "fail-worker"), "");
	await expect(
		promisify(execFile)(
			process.execPath,
			["--import", join(directory, "fake-fetch.mjs"), script],
			{
				cwd: directory,
				env: {
					...process.env,
					CLOUDFLARE_API_TOKEN: "storage-token",
					PATH: `${join(directory, "bin")}:${process.env.PATH}`,
				},
			},
		),
	).rejects.toThrow();
	expect(await readFile(join(directory, "calls"), "utf8")).toContain(
		"wrangler deploy",
	);
});
