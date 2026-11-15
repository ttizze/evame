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
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(
	new URL("./check-reader-static-edge.mjs", import.meta.url),
);
let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-static-edge-"));
	for (const path of [
		"bin",
		"fixture/single/server",
		"fixture/single/assets/ja/incremental-study/first",
		"dist/server",
	])
		await mkdir(join(directory, path), { recursive: true });
	await writeFile(
		join(directory, "fixture/single/server/index.js"),
		"export default {};",
	);
	const html = "<main>firstの本文 差分生成の著者</main>";
	await writeFile(
		join(
			directory,
			"fixture/single/assets/ja/incremental-study/first/index.html",
		),
		html,
	);
	await writeFile(
		join(directory, "dist/server/wrangler.json"),
		JSON.stringify({
			account_id: "test-account",
			compatibility_date: "2026-11-06",
			compatibility_flags: [],
			rules: [],
		}),
	);
	await writeFile(
		join(directory, "bin/bun"),
		'#!/bin/sh\nprintf "%s\\n" "$*" >> calls\nprintf "Unique Deployment URL: https://deployment.example.test\\n"\n',
		{ mode: 0o755 },
	);
	await writeFile(
		join(directory, "fetch.mjs"),
		`
let elapsed=0;
Object.defineProperty(performance,'now',{value:()=>elapsed});
globalThis.fetch=async input=>{
 const url=new URL(input);
 if(url.pathname==='/api/auth/get-session') throw new Error('検証用のAPI通信失敗');
 if(url.hostname.endsWith('.workers.dev') && process.env.READER_STUDY_FAILURE==='timeout'){
  elapsed=31000;
  return new Response('<main>旧版</main>',{status:200});
 }
 return new Response(${JSON.stringify(html)}, {status:200});
};
`,
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it.each([
	{
		label: "API検査",
		mode: "api",
		message: "検証用のAPI通信失敗",
		matches: true,
	},
	{
		label: "URLの切り替え待ち",
		mode: "timeout",
		message: "Preview URLが30秒以内に新しい版へ切り替わる",
		matches: false,
	},
])(
	"$labelに失敗しても直前のHTTP観測値を保存して隔離Previewを削除する",
	async ({ mode, message, matches }) => {
		await expect(
			promisify(execFile)(
				process.execPath,
				["--import", join(directory, "fetch.mjs"), script, "fixture"],
				{
					cwd: directory,
					env: {
						...process.env,
						PATH: `${join(directory, "bin")}:${process.env.PATH}`,
						READER_STUDY_FAILURE: mode,
					},
				},
			),
		).rejects.toThrow(message);
		const entries = await readdir(join(directory, ".data"));
		expect(entries).toHaveLength(1);
		const result = JSON.parse(
			await readFile(
				join(directory, ".data", entries[0], "result.json"),
				"utf8",
			),
		);
		expect(result.results).toEqual([
			{
				phase: "initial",
				deployMilliseconds: expect.any(Number),
				status: 200,
				observations: [
					{ milliseconds: expect.any(Number), status: 200, matches },
				],
			},
		]);
		expect(await readFile(join(directory, "calls"), "utf8")).toContain(
			"preview delete",
		);
	},
);
