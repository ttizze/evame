import { execFile } from "node:child_process";
import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("R2の削除が失敗しても全グループを削除してからPreviewと秘密値を片付ける", async () => {
	const directory = await mkdtemp(join(tmpdir(), "publication-cleanup-"));
	try {
		for (const path of [
			"bin",
			"dist/server",
			...[
				"ja",
				"ja/incremental-study/first",
				"en/incremental-study/first",
				"ja/incremental-study/second",
				"en/incremental-study/second",
			].map((path) => `fixture/single/assets/${path}`),
		])
			await mkdir(join(directory, path), { recursive: true });
		for (const path of [
			"ja",
			"ja/incremental-study/first",
			"en/incremental-study/first",
			"ja/incremental-study/second",
			"en/incremental-study/second",
		])
			await writeFile(
				join(directory, `fixture/single/assets/${path}/index.html`),
				"<main>firstの本文 差分生成の著者</main>",
			);
		await writeFile(
			join(directory, "dist/server/wrangler.json"),
			JSON.stringify({
				account_id: "test",
				compatibility_date: "2026-11-06",
				r2_buckets: [{ binding: "UPLOADS", bucket_name: "test" }],
			}),
		);
		await writeFile(
			join(directory, "bin/bun"),
			'#!/bin/sh\nprintf "%s\\n" "$*" >> calls\n',
			{ mode: 0o755 },
		);
		await writeFile(
			join(directory, "fetch.mjs"),
			`
import {appendFile} from 'node:fs/promises';
globalThis.fetch=async (input,init={})=>{
 const url=new URL(input);
 if(init.method==='DELETE') {
  await appendFile('deleted',decodeURIComponent(url.pathname)+'\\n');
  return new Response(null,{status:url.pathname.includes('home')?500:204});
 }
 return new Response(null,{status:init.method==='POST'?503:405});
};`,
		);
		await expect(
			promisify(execFile)(
				process.execPath,
				[
					"--import",
					join(directory, "fetch.mjs"),
					fileURLToPath(
						new URL("./check-reader-publication.mjs", import.meta.url),
					),
					"fixture",
				],
				{
					cwd: directory,
					env: {
						...process.env,
						PATH: `${join(directory, "bin")}:${process.env.PATH}`,
					},
				},
			),
		).rejects.toThrow();
		expect(
			(await readFile(join(directory, "deleted"), "utf8")).trim().split("\n"),
		).toHaveLength(3);
		expect(await readFile(join(directory, "calls"), "utf8")).toContain(
			"preview delete",
		);
		const [output] = await readdir(join(directory, ".data"));
		expect(await readdir(join(directory, ".data", output))).not.toContain(
			"secrets.json",
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 30000);
