import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "evame-deployment-"));
try {
	const serverDirectory = join(directory, "server");
	await cp(
		new URL("../.vercel/output/functions/__server.func", import.meta.url),
		serverDirectory,
		{ recursive: true },
	);
	const entryUrl = pathToFileURL(join(serverDirectory, "index.mjs")).href;
	const result = spawnSync(
		process.execPath,
		[
			"--input-type=module",
			"--eval",
			`import assert from 'node:assert/strict';
const { default: server } = await import(${JSON.stringify(entryUrl)});
const response = await server.fetch(new Request('http://localhost/api/auth/get-session'));
assert.equal(response.status, 200);
assert.equal(await response.text(), 'null');
console.log('デプロイ成果物を単独で起動し、未ログインの認証APIが200を返す');
const image = await server.fetch(new Request('http://localhost/api/og?slug=deployment-smoke-missing-page&locale=ja'));
assert.equal(image.status, 200);
assert.equal(image.headers.get('content-type'), 'image/png');
assert.deepEqual(new Uint8Array(await image.arrayBuffer()).slice(0, 8), new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
console.log('デプロイ成果物を単独で起動し、OG画像をPNGで生成できる');
process.exit(0);`,
		],
		{
			cwd: directory,
			env: {
				NODE_ENV: "production",
				SENTRY_DSN: "",
				DATABASE_URL: "postgres://postgres:postgres@db.localtest.me:5435/main",
				BETTER_AUTH_SECRET: "deployment-smoke-test-secret-32-characters",
				BETTER_AUTH_URL: "http://localhost",
				AUTH_GOOGLE_ID: "deployment-smoke-google-id",
				AUTH_GOOGLE_SECRET: "deployment-smoke-google-secret",
				RESEND_API_KEY: "re_deployment_smoke_test",
			},
			stdio: "inherit",
			timeout: 30_000,
		},
	);
	assert.ifError(result.error);
	assert.equal(result.status, 0);
} finally {
	await rm(directory, { recursive: true });
}
