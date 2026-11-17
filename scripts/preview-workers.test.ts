// @vitest-environment node
import { execFile } from "node:child_process";
import {
	mkdir,
	mkdtemp,
	readFile,
	realpath,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(new URL("./preview-workers.mjs", import.meta.url));
let directory: string;
const secrets = {
	TURSO_DATABASE_URL: "libsql://evame-preview-test.aws-ap-northeast-1.turso.io",
	TURSO_AUTH_TOKEN: "test-database-token",
	BETTER_AUTH_SECRET: "test-auth-secret",
	ENCRYPTION_KEY: "test-encryption-key",
	AUTH_RESEND_KEY: "test-mail-key",
};
beforeEach(async () => {
	directory = await realpath(
		await mkdtemp(join(tmpdir(), "evame-native-preview-")),
	);
	await mkdir(join(directory, "bin"));
	await mkdir(join(directory, "dist/client/_astro"), { recursive: true });
	await writeFile(
		join(directory, "dist/client/_astro/app.hash.js"),
		"export {};",
	);
	await writeFile(
		join(directory, "fake-fetch.mjs"),
		'import { appendFile } from "node:fs/promises";\nimport { existsSync } from "node:fs";\nglobalThis.fetch = async (url) => {\n const [, bucket, key] = new URL(url).pathname.match(/\\/buckets\\/([^/]+)\\/objects\\/(.+)/);\n await appendFile("calls", "R2 " + bucket + " PUT " + decodeURIComponent(key) + "\\n");\n return Response.json({ success: !existsSync("fail-assets") }, { status: existsSync("fail-assets") ? 403 : 200 });\n};',
	);
	await mkdir(join(directory, "dist/server/assets"), { recursive: true });
	await writeFile(
		join(directory, "dist/server/wrangler.json"),
		JSON.stringify({
			main: "index.js",
			account_id: "account",
			assets: { directory: "../client" },
			previews: {
				r2_buckets: [{ binding: "PUBLIC_HTML", bucket_name: "preview" }],
			},
		}),
	);
	await writeFile(
		join(directory, "dist/server/assets/db-test.js"),
		"export { createDb as t };",
	);
	await writeFile(
		join(directory, "bin/bun"),
		'#!/bin/sh\nprintf "%s\\n" "$*" >> calls\nif test -f fail-worker && test "$5" = dist/server/connected-wrangler.json; then exit 1; fi\n',
		{ mode: 0o755 },
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("本番DBの設定ではデプロイしない", async () => {
	await expect(
		promisify(execFile)(
			process.execPath,
			["--import", join(directory, "fake-fetch.mjs"), script],
			{
				cwd: directory,
				env: {
					...process.env,
					CLOUDFLARE_API_TOKEN: "storage-token",
					PR_NUMBER: "1140",
					EVAME_PREVIEW_SECRETS: JSON.stringify({
						...secrets,
						TURSO_DATABASE_URL: "libsql://production.turso.io",
					}),
					PATH: `${join(directory, "bin")}:${process.env.PATH}`,
				},
			},
		),
	).rejects.toThrow("A dedicated evame-preview database is required");
	await expect(readFile(join(directory, "calls"))).rejects.toThrow();
});

it.each(["", "../main", "0"])(
	"PR番号%sを拒否しデプロイしない",
	async (number) => {
		await expect(
			promisify(execFile)(
				process.execPath,
				["--import", join(directory, "fake-fetch.mjs"), script],
				{
					cwd: directory,
					env: {
						...process.env,
						CLOUDFLARE_API_TOKEN: "storage-token",
						PR_NUMBER: number,
						EVAME_PREVIEW_SECRETS: JSON.stringify(secrets),
					},
				},
			),
		).rejects.toThrow("PR_NUMBER is required");
		await expect(readFile(join(directory, "calls"))).rejects.toThrow();
	},
);

it("シード済みの専用DBを再利用し、マイグレーション後に標準PRプレビューを公開する", async () => {
	const output = join(directory, "output");
	const result = await promisify(execFile)(
		process.execPath,
		["--import", join(directory, "fake-fetch.mjs"), script],
		{
			cwd: directory,
			env: {
				...process.env,
				CLOUDFLARE_API_TOKEN: "storage-token",
				PR_NUMBER: "1140",
				GITHUB_OUTPUT: output,
				EVAME_PREVIEW_SECRETS: JSON.stringify({
					...secrets,
					BETTER_AUTH_URL: "https://old.example",
					CF_IMAGE_HOST: "images.evame.tech",
				}),
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		},
	);
	expect(
		(await readFile(join(directory, "calls"), "utf8")).trim().split("\n"),
	).toEqual([
		"run db:prod:migrate",
		"R2 preview PUT assets/_astro/app.hash.js",
		"x wrangler preview --config dist/server/connected-wrangler.json --name pr-1140 --worker-name evame-start --ignore-base-config --secrets-file .data/native-preview-pr-1140/app-secrets.json --var BETTER_AUTH_URL:https://pr-1140-evame-start.reimei.workers.dev --var QSTASH_PUBLISH_BASE_URL:https://pr-1140-evame-start.reimei.workers.dev",
	]);
	const saved = JSON.parse(
		await readFile(
			join(directory, ".data/native-preview-pr-1140/app-secrets.json"),
			"utf8",
		),
	);
	expect(saved).toEqual(secrets);
	expect(await readFile(output, "utf8")).toBe(
		"url=https://pr-1140-evame-start.reimei.workers.dev\n",
	);
	expect(result.stdout).not.toContain("test-database-token");
});

it("標準Previewの画像と公開HTMLを本番とは別のR2へ保存する", async () => {
	const config = JSON.parse(
		await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
	);
	expect(config.previews.r2_buckets).toEqual([
		{ binding: "UPLOADS", bucket_name: "evame-uploads-preview" },
		{ binding: "PUBLIC_HTML", bucket_name: "evame-public-html-preview" },
	]);
	expect(config.previews.vars.CF_IMAGE_HOST).toBe("");
	for (const bucket of config.previews.r2_buckets)
		expect(config.r2_buckets).not.toContainEqual(bucket);
});

it("統合Workerのプレビュー失敗を成功として返さない", async () => {
	await writeFile(join(directory, "fail-worker"), "");
	const output = join(directory, "output");
	await expect(
		promisify(execFile)(
			process.execPath,
			["--import", join(directory, "fake-fetch.mjs"), script],
			{
				cwd: directory,
				env: {
					...process.env,
					CLOUDFLARE_API_TOKEN: "storage-token",
					PR_NUMBER: "1140",
					GITHUB_OUTPUT: output,
					EVAME_PREVIEW_SECRETS: JSON.stringify(secrets),
					PATH: `${join(directory, "bin")}:${process.env.PATH}`,
				},
			},
		),
	).rejects.toThrow();
	await expect(readFile(output)).rejects.toThrow();
});
