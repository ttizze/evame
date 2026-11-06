// @vitest-environment node
import { execFile } from "node:child_process";
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	stat,
	utimes,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(new URL("./deploy-workers.mjs", import.meta.url));
let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-deploy-workers-"));
	await mkdir(join(directory, ".data/reader-assets"), { recursive: true });
	await mkdir(join(directory, "bin"));
	await mkdir(join(directory, "scripts"));
	await writeFile(
		join(directory, "scripts/generate-reader-html.mjs"),
		'import {appendFile} from "node:fs/promises"; await appendFile("deployments", "generate-html\\n");',
	);
	await writeFile(
		join(directory, ".data/reader-assets/active.json"),
		'["old.js"]',
	);
	await writeFile(
		join(directory, ".data/reader-assets/next.json"),
		'{"active":["new.js"],"retiring":["old.js"]}',
	);
	await mkdir(join(directory, ".data/reader-assets/files"));
	await writeFile(join(directory, ".data/reader-assets/files/old.js"), "old");
	const old = new Date(Date.now() - 31 * 86400000);
	await utimes(join(directory, ".data/reader-assets/files/old.js"), old, old);
	await writeFile(
		join(directory, "bin/bun"),
		'#!/bin/sh\nprintf "%s\\n" "$5" >> deployments\nif test -f fail-reader && test "$5" = reader/dist/server/wrangler.json; then exit 1; fi\n',
		{ mode: 0o755 },
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("準備したアセットの記録がなければWorkerを更新しない", async () => {
	await rm(join(directory, ".data/reader-assets/next.json"));
	await expect(
		promisify(execFile)(process.execPath, [script], {
			cwd: directory,
			env: {
				...process.env,
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		}),
	).rejects.toThrow();
	await expect(readFile(join(directory, "deployments"))).rejects.toThrow();
});

it("GatewayとReaderを順に更新してから配信中のアセットを確定する", async () => {
	const startedAt = Date.now();
	await promisify(execFile)(process.execPath, [script], {
		cwd: directory,
		env: {
			...process.env,
			PATH: `${join(directory, "bin")}:${process.env.PATH}`,
		},
	});
	expect(
		(await readFile(join(directory, "deployments"), "utf8")).trim().split("\n"),
	).toEqual([
		"dist/server/wrangler.json",
		"reader/dist/server/wrangler.json",
		"generate-html",
	]);
	expect(
		await readFile(join(directory, ".data/reader-assets/active.json"), "utf8"),
	).toBe('["new.js"]');
	await expect(
		readFile(join(directory, ".data/reader-assets/next.json")),
	).rejects.toThrow();
	expect(
		(await stat(join(directory, ".data/reader-assets/files/old.js"))).mtimeMs,
	).toBeGreaterThanOrEqual(startedAt);
});

it("Readerの更新に失敗した場合は旧版の配信中アセットを維持する", async () => {
	await writeFile(join(directory, "fail-reader"), "");
	await expect(
		promisify(execFile)(process.execPath, [script], {
			cwd: directory,
			env: {
				...process.env,
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		}),
	).rejects.toThrow();
	expect(
		await readFile(join(directory, ".data/reader-assets/active.json"), "utf8"),
	).toBe('["old.js"]');
});

it("HTML生成が失敗しても、更新が完了したWorkerのアセットの配信履歴を保持する", async () => {
	await writeFile(
		join(directory, "scripts/generate-reader-html.mjs"),
		'throw new Error("HTML generation failed");',
	);
	await expect(
		promisify(execFile)(process.execPath, [script], {
			cwd: directory,
			env: {
				...process.env,
				PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			},
		}),
	).rejects.toThrow();
	expect(
		await readFile(join(directory, ".data/reader-assets/active.json"), "utf8"),
	).toBe('["new.js"]');
});
