import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createTestHarness } from "wrangler";
import { compareReaderHtml } from "./compare-reader-html.mjs";

// 静的HTMLの内容更新だけを測る。初回のWorkerデプロイとDB・HTML生成時間は分ける。
assert.ok(
	process.argv[2],
	"check-reader-incremental.mjsの検証ディレクトリを指定する",
);
const source = resolve(process.argv[2], "single/assets");
const firstPath = "/ja/incremental-study/first";
const originalHtml = await readFile(`${source}${firstPath}/index.html`, "utf8");
assert.ok(
	originalHtml.includes("firstの本文") &&
		originalHtml.includes("差分生成の著者"),
	"配信前にダミー記事を確認する",
);
const parent = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
const bucket = parent.r2_buckets.find(
	(binding) => binding.binding === "UPLOADS",
);
assert.ok(bucket, "既存設定のR2 bindingを使用する");
const identifier = randomUUID();
const directory = resolve(`.data/reader-publication-${identifier}`);
await mkdir(directory, { recursive: true, mode: 0o700 });
const assets = `${directory}/assets`;
await cp(source, assets, { recursive: true });
const originalGroups = new Map();
for (const file of (await readdir(assets, { recursive: true })).filter((file) =>
	file.endsWith(".html"),
)) {
	if (file.endsWith("/index.html")) {
		const path = `/${file.slice(0, -"/index.html".length)}`;
		const [, locale, handle, slug] = path.split("/");
		const group = slug ? `article:${handle}/${slug}` : `home:${locale}`;
		if (!originalGroups.has(group)) originalGroups.set(group, {});
		originalGroups.get(group)[path] = await readFile(
			`${assets}/${file}`,
			"utf8",
		);
	}
	// HTMLはR2から返す。JS/CSS・画像は引き続きStatic Assetsで配信する。
	await rm(`${assets}/${file}`);
}
assert.equal(
	[...originalGroups.values()].flatMap((pages) => Object.keys(pages)).length,
	5,
	"日本語トップと2記事×2言語を測る",
);
const first = [...originalGroups].find(([, pages]) =>
	Object.hasOwn(pages, firstPath),
);
assert.ok(first, "更新対象の記事を含む");
const [group, originalPages] = first;
const config = `${directory}/wrangler.json`;
const secretsPath = `${directory}/secrets.json`;
const secret = randomBytes(32).toString("hex");
const name = `publication-study-${identifier.slice(0, 8)}`;
const origin = `https://${name}-evame-start.reimei.workers.dev`;
await writeFile(
	config,
	JSON.stringify({
		name: "evame-start",
		account_id: parent.account_id,
		main: resolve("scripts/reader-publication-worker.ts"),
		compatibility_date: parent.compatibility_date,
		assets: {
			binding: "ASSETS",
			directory: assets,
			run_worker_first: false,
			html_handling: "drop-trailing-slash",
		},
		cache: { enabled: false },
		previews: {
			r2_buckets: [{ binding: "HTML", bucket_name: bucket.bucket_name }],
			vars: {
				PUBLICATION_PREFIX: `reader-publication-study/${identifier}`,
			},
		},
	}),
);
await writeFile(secretsPath, JSON.stringify({ PUBLICATION_SECRET: secret }), {
	mode: 0o600,
});
const args = [
	"--config",
	config,
	"--name",
	name,
	"--worker-name",
	"evame-start",
];
const headers = {
	Authorization: `Bearer ${secret}`,
	"Content-Type": "application/json",
};
const results = [];
let ready = false;
let setupMilliseconds;

// すべての更新で同じ計測・認証・HTTP失敗の記録を使い、保存途中の結果も残す。
async function publish(phase, targetGroup, revision, pages) {
	const started = performance.now();
	const result = {
		phase,
		group: targetGroup,
		revision,
		writeMilliseconds: null,
		observations: [],
	};
	results.push(result);
	const response = await fetch(
		`${origin}/__publication/${encodeURIComponent(targetGroup)}`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({ revision, pages }),
			signal: AbortSignal.timeout(30000),
		},
	);
	result.writeMilliseconds = Math.round(performance.now() - started);
	result.status = response.status;
	assert.equal(response.status, 204, `版${revision}の配信更新が成功する`);
	await response.arrayBuffer();
	for (const path of Object.keys(originalGroups.get(targetGroup))) {
		const current = await fetch(new URL(path, origin), {
			redirect: "manual",
			signal: AbortSignal.timeout(30000),
		});
		const html = await current.text();
		result.observations.push({
			path,
			status: current.status,
			milliseconds: Math.round(performance.now() - started),
		});
		assert.equal(
			current.status,
			pages === null ? 404 : 200,
			"保存応答の直後から新しい公開状態を返す",
		);
		if (pages !== null) {
			assert.equal(html, pages[path], "保存応答後の最初のGETに最新HTMLを含む");
			assert.equal(
				current.headers.get("X-Publication-Revision"),
				String(revision),
			);
		}
	}
	console.log(JSON.stringify(result));
}

try {
	const started = performance.now();
	const output = execFileSync(
		"bun",
		[
			"x",
			"wrangler",
			"preview",
			...args,
			"--ignore-base-config",
			"--secrets-file",
			secretsPath,
		],
		{
			encoding: "utf8",
			stdio: ["ignore", "pipe", "inherit"],
			env: { ...process.env, SENTRY_DSN: "", VITE_SENTRY_DSN: "" },
		},
	);
	await writeFile(`${directory}/deployment.log`, output);
	for (;;) {
		const response = await fetch(`${origin}/__publication`, {
			headers,
			signal: AbortSignal.timeout(30000),
		});
		const body = await response.text();
		if (response.status === 405 && body === "") break;
		assert.ok(
			performance.now() - started < 45000,
			"初回のコード配信が利用可能になる",
		);
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	setupMilliseconds = Math.round(performance.now() - started);
	ready = true;
	for (const [key, pages] of originalGroups) {
		await publish("initial", key, 1, pages);
	}
	const unrelated = "/ja/incremental-study/second";
	const unrelatedBefore = await fetch(new URL(unrelated, origin));
	assert.equal(unrelatedBefore.status, 200);
	const unrelatedEtag = unrelatedBefore.headers.get("ETag");
	await unrelatedBefore.arrayBuffer();
	let revision = 1;
	for (let iteration = 1; iteration <= 5; iteration++) {
		const pages = Object.fromEntries(
			Object.entries(originalPages).map(([path, html]) => [
				path,
				html.replaceAll("firstの本文", `更新した本文${iteration}`),
			]),
		);
		await publish("update", group, ++revision, pages);
		const staleRevision = revision;
		await publish("unpublish", group, ++revision, null);
		const stale = await fetch(
			`${origin}/__publication/${encodeURIComponent(group)}`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({ revision: staleRevision, pages }),
				signal: AbortSignal.timeout(30000),
			},
		);
		assert.equal(
			stale.status,
			409,
			"遅れて届いた古いHTMLで非公開化を取り消さない",
		);
		assert.equal((await fetch(new URL(firstPath, origin))).status, 404);
		await publish("republish", group, ++revision, originalPages);
	}
	const unrelatedAfter = await fetch(new URL(unrelated, origin));
	assert.equal(
		unrelatedAfter.headers.get("ETag"),
		unrelatedEtag,
		"変更していない記事は差し替えない",
	);
	await unrelatedAfter.arrayBuffer();
	// 同時到着ではCAS競合を許容し、最新の版の再送だけで収束する。
	const latest = revision + 2;
	const concurrent = await Promise.all(
		[latest - 1, latest].map((value) =>
			fetch(`${origin}/__publication/${encodeURIComponent(group)}`, {
				method: "POST",
				headers,
				body: JSON.stringify({ revision: value, pages: originalPages }),
				signal: AbortSignal.timeout(30000),
			}),
		),
	);
	for (const response of concurrent) {
		assert.ok(
			[204, 409, 429].includes(response.status),
			"並行保存の結果を検査する",
		);
		await response.arrayBuffer();
	}
	await publish("concurrent-retry", group, latest, originalPages);
	await writeFile(
		`${directory}/baseline.mjs`,
		"export default {fetch(){return new Response(null,{status:404});}};",
	);
	const baselineConfig = `${directory}/baseline.json`;
	await writeFile(
		baselineConfig,
		JSON.stringify({
			name: "reader-publication-baseline",
			main: "./baseline.mjs",
			compatibility_date: parent.compatibility_date,
			assets: {
				binding: "ASSETS",
				directory: source,
				html_handling: "drop-trailing-slash",
			},
		}),
	);
	const baseline = createTestHarness({
		workers: [{ configPath: baselineConfig }],
	});
	try {
		const { url } = await baseline.listen();
		await compareReaderHtml(directory, [url.href, origin], ["/ja", firstPath]);
	} finally {
		await baseline.close();
	}
	console.log(
		"Chrome・WebKitのPC／モバイルでStatic AssetsとR2の初回表示が一致",
	);
	console.log(
		`初回セットアップ: ${setupMilliseconds}ms。内容更新の再デプロイ: 0回`,
	);
} finally {
	try {
		if (ready) {
			for (const key of originalGroups.keys()) {
				const response = await fetch(
					`${origin}/__publication/${encodeURIComponent(key)}`,
					{
						method: "DELETE",
						headers,
						signal: AbortSignal.timeout(30000),
					},
				);
				assert.equal(response.status, 204, "今回のR2 prefixだけを削除する");
				await response.arrayBuffer();
			}
		}
	} finally {
		try {
			execFileSync(
				"bun",
				["x", "wrangler", "preview", "delete", ...args, "--skip-confirmation"],
				{ stdio: "inherit" },
			);
		} finally {
			await rm(secretsPath, { force: true });
			await writeFile(
				`${directory}/result.json`,
				JSON.stringify(
					{
						setupMilliseconds,
						contentDeployments: 0,
						scope:
							"生成済みHTMLの送信開始から保存応答と後続GETまで。DB保存・HTML生成・コード配信時間は含めない。",
						results,
						directory,
					},
					null,
					2,
				),
			);
			console.log(`検証結果: ${directory}/result.json`);
		}
	}
}
