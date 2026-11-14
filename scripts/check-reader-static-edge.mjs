import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// ダミー記事だけを隔離Previewへ配信する。AppのAPI・DB・service bindingは公開しない。
assert.ok(
	process.argv[2],
	"check-reader-incremental.mjsが出力した検証ディレクトリを指定する",
);
const source = resolve(process.argv[2], "single");
const originalHtml = await readFile(
	`${source}/assets/ja/incremental-study/first/index.html`,
	"utf8",
);
assert.ok(
	originalHtml.includes("firstの本文") &&
		originalHtml.includes("差分生成の著者"),
	"初回生成したダミー記事を配信前に確認する",
);
const identifier = randomUUID();
const directory = resolve(`.data/static-edge-${identifier}`);
await mkdir(directory, { recursive: true });
await cp(`${source}/server`, `${directory}/server`, { recursive: true });
await cp(`${source}/assets`, `${directory}/assets`, { recursive: true });
await writeFile(
	`${directory}/server/edge.mjs`,
	"import './index.js'; export default {fetch(){return new Response('dynamic-disabled',{status:404});}};",
);
const parent = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const config = `${directory}/wrangler.json`;
await writeFile(
	config,
	JSON.stringify({
		name: "evame-start",
		account_id: parent.account_id,
		main: "./server/edge.mjs",
		compatibility_date: parent.compatibility_date,
		compatibility_flags: parent.compatibility_flags,
		rules: parent.rules,
		no_bundle: true,
		assets: {
			directory: "./assets",
			binding: "ASSETS",
			run_worker_first: false,
			html_handling: "drop-trailing-slash",
		},
		previews: { vars: { SENTRY_DSN: "", VITE_SENTRY_DSN: "" } },
	}),
);
const name = `static-study-${identifier.slice(0, 8)}`;
const origin = `https://${name}-evame-start.reimei.workers.dev`;
const args = [
	"--config",
	config,
	"--name",
	name,
	"--worker-name",
	"evame-start",
];
const results = [];
try {
	for (const phase of ["initial", "update", "unpublish"]) {
		const path = `${directory}/assets/ja/incremental-study/first/index.html`;
		if (phase === "update") {
			await writeFile(
				path,
				originalHtml.replaceAll("firstの本文", "edgeで更新した本文"),
			);
		}
		if (phase === "unpublish") await rm(path);
		const started = performance.now();
		const output = execFileSync(
			"bun",
			["x", "wrangler", "preview", ...args, "--ignore-base-config"],
			{
				encoding: "utf8",
				stdio: ["ignore", "pipe", "inherit"],
				env: { ...process.env, SENTRY_DSN: "", VITE_SENTRY_DSN: "" },
			},
		);
		const deployMilliseconds = Math.round(performance.now() - started);
		const deployment = output.match(
			/Unique Deployment URL: (https:\/\/[^\s]+)/,
		)?.[1];
		assert.ok(deployment, "新しいデプロイ固有URLが返る");
		await writeFile(`${directory}/${phase}.log`, output);
		const unique = await fetch(`${deployment}/ja/incremental-study/first`, {
			redirect: "manual",
			cache: "no-store",
			signal: AbortSignal.timeout(30000),
		});
		const expectedHtml = await unique.text();
		assert.equal(unique.status, phase === "unpublish" ? 404 : 200);
		if (phase === "initial") assert.ok(expectedHtml.includes("firstの本文"));
		if (phase === "update")
			assert.ok(expectedHtml.includes("edgeで更新した本文"));
		// CLI完了と可変Preview URLの切り替わりを区別して計測する。
		const observations = [];
		for (;;) {
			const response = await fetch(`${origin}/ja/incremental-study/first`, {
				redirect: "manual",
				cache: "no-store",
				signal: AbortSignal.timeout(30000),
			});
			const html = await response.text();
			const current = {
				milliseconds: Math.round(performance.now() - started),
				status: response.status,
				matches: response.status === unique.status && html === expectedHtml,
			};
			observations.push(current);
			if (current.matches) break;
			assert.ok(
				current.milliseconds - deployMilliseconds < 30000,
				"Preview URLが30秒以内に新しい版へ切り替わる",
			);
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		const api = await fetch(`${origin}/api/auth/get-session`, {
			signal: AbortSignal.timeout(30000),
		});
		assert.equal(api.status, 404);
		assert.equal(
			await api.text(),
			"dynamic-disabled",
			"隔離Previewは実際のApp APIを呼び出さない",
		);
		const result = {
			phase,
			deployMilliseconds,
			status: unique.status,
			observations,
		};
		results.push(result);
		console.log(JSON.stringify(result));
	}
} finally {
	// UUIDで作った今回のPreviewだけを、途中失敗でも削除する。
	try {
		execFileSync(
			"bun",
			["x", "wrangler", "preview", "delete", ...args, "--skip-confirmation"],
			{ stdio: "inherit" },
		);
	} finally {
		await writeFile(
			`${directory}/result.json`,
			JSON.stringify({ results, directory }, null, 2),
		);
		console.log(`検証結果: ${directory}/result.json`);
	}
}
