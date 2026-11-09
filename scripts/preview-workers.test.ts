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
	PREVIEW_READER_SECRET: "test-reader-secret",
};
beforeEach(async () => {
	directory = await realpath(
		await mkdtemp(join(tmpdir(), "evame-native-preview-")),
	);
	await mkdir(join(directory, "bin"));
	await writeFile(
		join(directory, "bin/bun"),
		'#!/bin/sh\nprintf "%s\\n" "$*" >> calls\nif test -f fail-reader && test "$5" = reader/dist/server/wrangler.json; then exit 1; fi\n',
		{ mode: 0o755 },
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("本番DBの設定ではデプロイしない", async () => {
	await expect(
		promisify(execFile)(process.execPath, [script], {
			cwd: directory,
			env: {
				...process.env,
				PR_NUMBER: "1140",
				EVAME_PREVIEW_SECRETS: JSON.stringify({
					...secrets,
					TURSO_DATABASE_URL: "libsql://production.turso.io",
				}),
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		}),
	).rejects.toThrow("A dedicated evame-preview database is required");
	await expect(readFile(join(directory, "calls"))).rejects.toThrow();
});

it.each(["", "../main", "0"])(
	"PR番号%sを拒否しデプロイしない",
	async (number) => {
		await expect(
			promisify(execFile)(process.execPath, [script], {
				cwd: directory,
				env: {
					...process.env,
					PR_NUMBER: number,
					EVAME_PREVIEW_SECRETS: JSON.stringify(secrets),
				},
			}),
		).rejects.toThrow("PR_NUMBER is required");
		await expect(readFile(join(directory, "calls"))).rejects.toThrow();
	},
);

it("専用DBを更新し、ReaderとGatewayをCloudflare標準の同じPRプレビューへ公開する", async () => {
	const result = await promisify(execFile)(process.execPath, [script], {
		cwd: directory,
		env: {
			...process.env,
			PR_NUMBER: "1140",
			EVAME_PREVIEW_SECRETS: JSON.stringify(secrets),
			PATH: `${join(directory, "bin")}:${process.env.PATH}`,
		},
	});
	const calls = (await readFile(join(directory, "calls"), "utf8"))
		.trim()
		.split("\n");
	expect(calls).toEqual([
		"run db:prod:migrate",
		"run db:prod:seed",
		"x wrangler preview --config reader/dist/server/wrangler.json --name reader-pr-1140 --worker-name evame-start --ignore-base-config --secrets-file .data/native-preview-pr-1140/reader-secrets.json --var PREVIEW_GATEWAY_ORIGIN:https://pr-1140-evame-start.reimei.workers.dev",
		"x wrangler preview --config dist/server/wrangler.json --name pr-1140 --worker-name evame-start --ignore-base-config --secrets-file .data/native-preview-pr-1140/gateway-secrets.json --var PREVIEW_READER_ORIGIN:https://reader-pr-1140-evame-start.reimei.workers.dev --var BETTER_AUTH_URL:https://pr-1140-evame-start.reimei.workers.dev --var QSTASH_PUBLISH_BASE_URL:https://pr-1140-evame-start.reimei.workers.dev",
	]);
	const reader = JSON.parse(
		await readFile(
			join(directory, ".data/native-preview-pr-1140/reader-secrets.json"),
			"utf8",
		),
	);
	expect(reader).toEqual({
		PREVIEW_READER_SECRET: secrets.PREVIEW_READER_SECRET,
	});
	expect(result.stdout).not.toContain("test-database-token");
});

it("Readerのプレビューに失敗したらGatewayを更新しない", async () => {
	await writeFile(join(directory, "fail-reader"), "");
	await expect(
		promisify(execFile)(process.execPath, [script], {
			cwd: directory,
			env: {
				...process.env,
				PR_NUMBER: "1140",
				EVAME_PREVIEW_SECRETS: JSON.stringify(secrets),
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		}),
	).rejects.toThrow();
	expect(await readFile(join(directory, "calls"), "utf8")).not.toContain(
		"--config dist/server/wrangler.json",
	);
});
