import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { fromJSON } from "seroval";
import { createTestHarness } from "wrangler";
import { startTursoServer } from "./turso-dev-server.mjs";

// 実際のReaderを別ディレクトリへビルドする。本番の設定・DB・Workerは変更しない。
const directory = resolve(`.data/reader-incremental-${randomUUID()}`);
await mkdir(directory, { recursive: true });
const databasePath = `${directory}/study.db`;
const local = createClient({ url: `file:${databasePath}` });
await migrate(drizzle(local), { migrationsFolder: "./src/drizzle" });
local.close();
const turso = await startTursoServer(databasePath, null);
const database = createClient({ url: turso.url });
const userId = "incremental-study-user";
const handle = "incremental-study";
let entries = [];
let rendered = [];
let databaseRequests = 0;
const invoked = { app: 0, split: 0 };
const server = createServer(async (request, response) => {
	try {
		const url = new URL(request.url, "http://localhost");
		if (url.pathname === "/manifest") {
			response.setHeader("content-type", "application/json");
			response.end(JSON.stringify(entries));
		} else if (url.pathname === "/render") {
			rendered.push(url.searchParams.get("path"));
			response.writeHead(204).end();
		} else if (url.pathname === "/invoked") {
			invoked[url.searchParams.get("kind")]++;
			response.writeHead(204).end();
		} else {
			databaseRequests++;
			const body = [];
			for await (const chunk of request) body.push(chunk);
			const headers = new Headers(request.headers);
			for (const name of [
				"host",
				"connection",
				"transfer-encoding",
				"content-length",
			])
				headers.delete(name);
			const upstream = await fetch(new URL(request.url, turso.url), {
				method: request.method,
				headers,
				body: body.length ? Buffer.concat(body) : undefined,
			});
			const responseHeaders = new Headers(upstream.headers);
			for (const name of [
				"connection",
				"transfer-encoding",
				"content-length",
				"content-encoding",
			])
				responseHeaders.delete(name);
			response.writeHead(upstream.status, Object.fromEntries(responseHeaders));
			response.end(Buffer.from(await upstream.arrayBuffer()));
		}
	} catch {
		response.writeHead(500).end("Local incremental study failed");
	}
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let harness;
let singleHarness;
let splitHarness;
const results = [];
let previousEntries = [];
let previousRevision = null;
try {
	await database.execute({
		sql: "INSERT INTO users (id,name,search_name,handle,email) VALUES (?, '差分生成の著者', 'incremental study', ?, 'incremental@example.test')",
		args: [userId, handle],
	});
	for (const slug of ["first", "second"]) {
		const content = await database.execute(
			"INSERT INTO contents (kind) VALUES ('PAGE') RETURNING id",
		);
		const id = Number(content.rows[0].id);
		await database.execute({
			sql: "INSERT INTO pages (id,slug,source_locale,status,user_id,mdast_json,created_at,published_at) VALUES (?,?,'ja','PUBLIC',?,?,0,0)",
			args: [
				id,
				slug,
				userId,
				JSON.stringify({
					type: "root",
					children: [
						{
							type: "heading",
							depth: 2,
							data: { hProperties: { "data-number-id": "1" } },
							children: [{ type: "text", value: "目次の見出し" }],
						},
						{
							type: "paragraph",
							data: { hProperties: { "data-number-id": "2" } },
							children: [{ type: "text", value: `${slug}の本文` }],
						},
					],
				}),
			],
		});
		for (const [number, text] of [
			[0, `${slug}の記事`],
			[1, "目次の見出し"],
			[2, `${slug}の本文`],
		])
			await database.execute({
				sql: "INSERT INTO segments (content_id,number,text,text_and_occurrence_hash) VALUES (?,?,?,?)",
				args: [id, number, text, `${slug}-${number}`],
			});
	}
	const first = Number(
		(await database.execute("SELECT id FROM pages WHERE slug='first'")).rows[0]
			.id,
	);
	const workers = [
		{ configPath: "gateway/dist/wrangler.json" },
		{
			configPath: "dist/server/wrangler.json",
			secrets: {
				SENTRY_DSN: "",
				TURSO_DATABASE_URL: origin,
				TURSO_AUTH_TOKEN: "",
				BETTER_AUTH_SECRET: "incremental-study-auth-secret-32-characters",
				BETTER_AUTH_URL: "http://localhost",
				AUTH_RESEND_KEY: "re_incremental_study",
				AUTH_GOOGLE_ID: "incremental-study-google-id",
				AUTH_GOOGLE_SECRET: "incremental-study-google-secret",
				GOOGLE_ANALYTICS_ID: "",
			},
		},
		{
			configPath: "reader/dist/server/wrangler.json",
			secrets: { SENTRY_DSN: "" },
		},
	];
	harness = createTestHarness({ workers });
	const baselineServer = await harness.listen();
	const gateway = harness.getWorker("evame-gateway");
	const route = resolve("reader/src/pages/[...path].astro");
	const source = await readFile(route, "utf8");
	const start = source.indexOf("const response = await fetchReaderData(");
	const end = source.indexOf("// 旧Backend", start);
	assert.ok(start >= 0 && end > start, "Readerのデータ取得境界が見つかる");
	const staticSource = `${source.slice(0, start)}
export const prerender = true;
export async function getStaticPaths() {
 const entries = await (await fetch(${JSON.stringify(`${origin}/manifest`)})).json();
 return entries.map(entry => ({params: {path: entry.path.slice(1)}, props: {payload: entry.payload}, cacheKey: entry.cacheKey}));
}
await fetch(${JSON.stringify(`${origin}/render`)} + '?path=' + encodeURIComponent(Astro.url.pathname));
const { page: result, gaTrackingId } = fromJSON(Astro.props.payload) as {page: NonNullable<Awaited<ReturnType<typeof loadReaderData>>>;gaTrackingId: string;};
${source.slice(end)}`;
	await mkdir(`${directory}/src/pages`, { recursive: true });
	await writeFile(
		`${directory}/src/pages/[...path].astro`,
		staticSource.replace(
			/(from\s*["'])(\.[^"']+)(["'])/g,
			(_, prefix, path, suffix) =>
				`${prefix}${resolve(dirname(route), path)}${suffix}`,
		),
	);
	await writeFile(
		`${directory}/src/pages/404.astro`,
		`---\nimport Missing from ${JSON.stringify(resolve("reader/src/pages/404.astro"))};\n---\n<Missing />`,
	);
	await writeFile(
		`${directory}/package.json`,
		'{"type":"module","private":true}',
	);
	await writeFile(
		`${directory}/wrangler.jsonc`,
		JSON.stringify({
			name: "evame-reader",
			main: resolve("reader/src/worker.ts"),
			compatibility_date: "2026-11-06",
			compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
			assets: { html_handling: "drop-trailing-slash" },
		}),
	);
	await writeFile(
		`${directory}/astro.config.mjs`,
		`
import {defineConfig} from 'astro/config';
import original from ${JSON.stringify(resolve("reader/astro.config.mjs"))};
export default defineConfig({...original,
 trailingSlash: 'never',
 publicDir: ${JSON.stringify(resolve("public"))},
 outDir: './dist', cacheDir: './cache', experimental: {incrementalBuild: true},
});`,
	);
	for (const phase of [
		"initial",
		"unchanged",
		"body",
		"translation",
		"comments",
		"template",
		"unpublish",
	]) {
		if (phase === "body") {
			await database.execute({
				sql: "UPDATE segments SET text='更新した本文' WHERE content_id=? AND number=2",
				args: [first],
			});
			await database.execute({
				sql: "UPDATE pages SET mdast_json=json_set(mdast_json, '$.children[1].children[0].value', '更新した本文') WHERE id=?",
				args: [first],
			});
		}
		if (phase === "translation")
			await database.execute({
				sql: "INSERT INTO segment_translations (segment_id,user_id,locale,text) SELECT id,?,'en','Updated English body' FROM segments WHERE content_id=? AND number=2",
				args: [userId, first],
			});
		if (phase === "comments") {
			for (let index = 1; index <= 21; index++) {
				const content = await database.execute(
					"INSERT INTO contents (kind) VALUES ('PAGE_COMMENT') RETURNING id",
				);
				const id = Number(content.rows[0].id);
				await database.execute({
					sql: "INSERT INTO page_comments (id,page_id,user_id,locale,mdast_json,created_at) VALUES (?,?,?,'ja',?,?)",
					args: [
						id,
						first,
						userId,
						JSON.stringify({
							type: "root",
							children: [
								{
									type: "paragraph",
									data: { hProperties: { "data-number-id": "0" } },
									children: [
										{
											type: "text",
											value: `検証コメント${String(index).padStart(2, "0")}`,
										},
									],
								},
							],
						}),
						index,
					],
				});
				await database.execute({
					sql: "INSERT INTO segments (content_id,number,text,text_and_occurrence_hash) VALUES (?,0,?,?)",
					args: [
						id,
						`検証コメント${String(index).padStart(2, "0")}`,
						`comment-${index}`,
					],
				});
			}
		}
		if (phase === "template") {
			const path = `${directory}/src/pages/[...path].astro`;
			await writeFile(
				path,
				`${await readFile(path, "utf8")}\n<!--差分生成のテンプレート変更-->`,
			);
		}
		if (phase === "unpublish") {
			await database.execute({
				sql: "UPDATE pages SET status='DRAFT' WHERE id=?",
				args: [first],
			});
			const live = await gateway.fetch(`http://localhost/ja/${handle}/first`);
			assert.equal(live.status, 404, "現行のSSRは非公開化を直ちに反映する");
			assert.ok(
				(
					await readFile(
						`${directory}/dist/client/ja/${handle}/first/index.html`,
						"utf8",
					)
				).includes("更新した本文"),
				"ビルド済みHTMLはDBの非公開化だけでは消えない",
			);
		}
		entries = [];
		const beforeInput = databaseRequests;
		const revision = Number(
			(
				await database.execute(
					"SELECT revision FROM reader_revisions WHERE key='*'",
				)
			).rows[0].revision,
		);
		const changes =
			previousRevision === null
				? []
				: JSON.parse(
						execFileSync(
							"bun",
							[
								"-e",
								`
import {fetchReaderChanges} from './src/db/queries.ts';
import {disposeDb} from './src/db';
console.log(JSON.stringify((await fetchReaderChanges(Number(process.env.READER_STUDY_REVISION))).map(row=>row.key)));
await disposeDb();
`,
							],
							{
								encoding: "utf8",
								env: {
									...process.env,
									TURSO_DATABASE_URL: turso.url,
									TURSO_AUTH_TOKEN: "",
									READER_STUDY_REVISION: String(previousRevision),
									SENTRY_DSN: "",
									VITE_SENTRY_DSN: "",
								},
							},
						),
					);
		const changedKeys = new Set(changes);
		const fetchedInputs = [];
		const paths = ["/ja"];
		const pages = await database.execute(
			"SELECT slug FROM pages WHERE status='PUBLIC' ORDER BY slug",
		);
		for (const row of pages.rows)
			for (const locale of ["ja", "en"])
				paths.push(`/${locale}/${handle}/${row.slug}`);
		for (const path of paths) {
			const previous = previousEntries.find((entry) => entry.path === path);
			if (
				previous &&
				!fromJSON(previous.payload).page.cacheKeys.some((key) =>
					changedKeys.has(key),
				)
			) {
				entries.push(previous);
				continue;
			}
			fetchedInputs.push(path);
			const response = await gateway.fetch(
				`http://localhost/api/reader-data?${new URLSearchParams({ path, search: "" })}`,
			);
			assert.equal(
				response.status,
				200,
				`${path}: ${await response.clone().text()}`,
			);
			const payload = await response.json();
			entries.push({
				path,
				payload,
				cacheKey: createHash("sha256")
					.update(JSON.stringify(payload))
					.digest("hex"),
			});
		}
		rendered = [];
		let log = "";
		const started = performance.now();
		const child = spawn(
			"bun",
			["x", "astro", "build", "--root", directory, "--timings"],
			{
				env: {
					...process.env,
					SENTRY_DSN: "",
					VITE_SENTRY_DSN: "",
					CLOUDFLARE_API_TOKEN: "",
				},
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		child.stdout.on("data", (data) => {
			log += data;
		});
		child.stderr.on("data", (data) => {
			log += data;
		});
		const exit = await new Promise((resolve, reject) => {
			child.once("error", reject);
			child.once("exit", resolve);
		});
		await writeFile(`${directory}/${phase}.log`, log);
		assert.equal(exit, 0, `${phase}: ${directory}/${phase}.log`);
		const expected = {
			initial: paths,
			unchanged: [],
			body: [`/ja/${handle}/first`, `/en/${handle}/first`],
			translation: [`/en/${handle}/first`],
			comments: ["/ja", `/ja/${handle}/first`, `/en/${handle}/first`],
			template: paths,
			unpublish: ["/ja"],
		}[phase];
		assert.deepEqual(
			[...rendered].sort(),
			[...expected].sort(),
			`${phase}で変更対象だけを生成する`,
		);
		const result = {
			phase,
			milliseconds: Math.round(performance.now() - started),
			inputDatabaseRequests: databaseRequests - beforeInput,
			fetchedInputs,
			rendered: [...rendered],
		};
		results.push(result);
		if (phase === "unchanged")
			assert.deepEqual(
				fetchedInputs,
				[],
				"変更がなければ本文データも再取得しない",
			);
		previousEntries = entries;
		previousRevision = revision;
		console.log(JSON.stringify(result));
		if (["body", "translation", "comments"].includes(phase))
			assert.ok(
				(
					await readFile(
						`${directory}/dist/client/ja/${handle}/first/index.html`,
						"utf8",
					)
				).includes("更新した本文"),
				"差分生成したHTMLへ最新の本文を反映する",
			);
		if (phase === "translation")
			assert.ok(
				(
					await readFile(
						`${directory}/dist/client/en/${handle}/first/index.html`,
						"utf8",
					)
				).includes("Updated English body"),
				"翻訳した言語のHTMLを更新する",
			);
		if (phase === "comments") {
			const dynamic = await gateway.fetch(
				`http://localhost/ja/${handle}/first?page=2`,
			);
			const dynamicHtml = await dynamic.text();
			const staticHtml = await readFile(
				`${directory}/dist/client/ja/${handle}/first/index.html`,
				"utf8",
			);
			assert.equal(dynamic.status, 200);
			assert.notEqual(
				dynamicHtml.includes("検証コメント21"),
				staticHtml.includes("検証コメント21"),
				"コメント2ページ目もクエリを無視した静的配信では維持できない",
			);
		}
		if (phase === "initial") {
			// Readerの実行時分離を外し、Appと静的HTMLを1つのWorkerへまとめる。
			await cp("dist/server", `${directory}/single/server`, {
				recursive: true,
			});
			await cp("dist/client", `${directory}/single/assets`, {
				recursive: true,
			});
			await cp(`${directory}/dist/client`, `${directory}/single/assets`, {
				recursive: true,
			});
			await writeFile(
				`${directory}/single/server/wrapper.mjs`,
				`
import app from './index.js';
export {ReaderBackend, GatewayMonitoring} from './index.js';
export default {async fetch(request,env,ctx){await fetch(${JSON.stringify(`${origin}/invoked?kind=app`)});return app.fetch(request,env,ctx);}};
`,
			);
			const appConfig = JSON.parse(
				await readFile("dist/server/wrangler.json", "utf8"),
			);
			const singleConfig = {
				...appConfig,
				main: "./wrapper.mjs",
				services: [],
				assets: {
					...appConfig.assets,
					directory: `${directory}/single/assets`,
					run_worker_first: false,
				},
			};
			await writeFile(
				`${directory}/single/server/wrangler.json`,
				JSON.stringify(singleConfig),
			);
			singleHarness = createTestHarness({
				workers: [
					{
						configPath: `${directory}/single/server/wrangler.json`,
						secrets: workers[1].secrets,
					},
				],
			});
			const singleServer = await singleHarness.listen();
			// HTTP入口を使い、サービスへの直接呼び出しと異なるAssets優先ルーティングも通す。
			for (const path of paths) {
				const before = { ...invoked };
				const beforeDatabase = databaseRequests;
				const response = await fetch(new URL(path, singleServer.url), {
					redirect: "manual",
				});
				assert.equal(
					response.status,
					200,
					`${path}: ${await response.clone().text()}`,
				);
				assert.ok((await response.text()).includes("<main"));
				assert.deepEqual(
					invoked,
					before,
					"1 Workerでも公開HTMLはAppを起動せず配信する",
				);
				assert.equal(
					databaseRequests,
					beforeDatabase,
					"1 Workerの静的HTMLはDBへ接続しない",
				);
			}
			const staticQuery = await fetch(
				new URL(`/ja/${handle}/first?view=source`, singleServer.url),
			);
			const dynamicQuery = await gateway.fetch(
				`http://localhost/ja/${handle}/first?view=source`,
			);
			assert.match(
				await staticQuery.text(),
				/data-view="both"/,
				"通常の静的ファイルはクエリで表示形式を分けない",
			);
			assert.match(
				await dynamicQuery.text(),
				/data-view="source"/,
				"現行SSRはクエリの表示形式を反映する",
			);
			const session = await fetch(
				new URL("/api/auth/get-session", singleServer.url),
			);
			assert.equal(session.status, 200, await session.clone().text());
			assert.equal(await session.text(), "null");
			assert.equal(invoked.app, 1, "同じWorkerで動的APIだけAppを呼ぶ");

			await writeFile(
				`${directory}/split.mjs`,
				`export default {async fetch(request,env){await fetch(${JSON.stringify(`${origin}/invoked?kind=split`)});return env.APP.fetch(request);}};`,
			);
			await writeFile(
				`${directory}/split.json`,
				JSON.stringify({
					name: "static-study-gateway",
					main: "./split.mjs",
					compatibility_date: "2026-11-06",
					assets: {
						binding: "ASSETS",
						directory: `${directory}/single/assets`,
						run_worker_first: false,
						html_handling: "drop-trailing-slash",
					},
					services: [{ binding: "APP", service: "evame-start" }],
				}),
			);
			splitHarness = createTestHarness({
				workers: [
					{ configPath: `${directory}/split.json` },
					{
						configPath: `${directory}/single/server/wrangler.json`,
						secrets: workers[1].secrets,
					},
				],
			});
			const splitServer = await splitHarness.listen();
			for (const path of ["/ja", `/ja/${handle}/first`]) {
				const before = { ...invoked };
				const response = await fetch(new URL(path, splitServer.url), {
					redirect: "manual",
				});
				assert.equal(response.status, 200, path);
				await response.text();
				assert.deepEqual(
					invoked,
					before,
					"2 Workerでも公開HTMLはWorkerコードを呼ばない",
				);
			}
			const splitSession = await fetch(
				new URL("/api/auth/get-session", splitServer.url),
			);
			assert.equal(splitSession.status, 200);
			assert.equal(await splitSession.text(), "null");
			assert.deepEqual(invoked, { app: 2, split: 1 });
			result.layouts = {
				single: { htmlWorkerInvocations: 0, apiWorkerInvocations: 1 },
				split: { htmlWorkerInvocations: 0, apiWorkerInvocations: 2 },
			};
			// 公式のスクリーンショット比較で安定した描画を待つ。PNGのバイト列比較は使わない。
			await writeFile(
				`${directory}/visual.config.mjs`,
				`
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'visual.spec.mjs',workers:1,retries:0,
 updateSnapshots:'none',reporter:'list',outputDir:'./visual-results',
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 expect:{toHaveScreenshot:{maxDiffPixels:0}}});
`,
			);
			await writeFile(
				`${directory}/visual.spec.mjs`,
				`
import {test,expect} from '@playwright/test';
const origins=${JSON.stringify([baselineServer.url.href, singleServer.url.href, splitServer.url.href])};
const targets=process.env.READER_STUDY_VISUAL_MODE==='baseline'?origins.slice(0,1):origins.slice(1);
for(const width of [1280,390])for(const path of ${JSON.stringify(["/ja", `/ja/${handle}/first`])}){
 test(width+' '+path+' の初回HTMLが既存SSRと一致する',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:'light'});
  // 初回HTMLだけを比較し、閲覧数の書き込みを起こさない。
  await context.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue());
  try{for(const origin of targets){
   const page=await context.newPage();
   const response=await page.goto(new URL(path,origin).href);
   expect(response.status()).toBe(200);
   await expect(page.locator('main')).toBeVisible();
   await expect(page).toHaveScreenshot(width+'-'+path.replaceAll('/','_')+'.png');
   await page.close();
  }}finally{await context.close();}
 });
}
`,
			);
			for (const mode of ["baseline", "compare"]) {
				const visual = spawn(
					"bun",
					[
						"x",
						"playwright",
						"test",
						"--config",
						`${directory}/visual.config.mjs`,
						...(mode === "baseline" ? ["--update-snapshots=all"] : []),
					],
					{
						env: {
							...process.env,
							SENTRY_DSN: "",
							VITE_SENTRY_DSN: "",
							READER_STUDY_VISUAL_MODE: mode,
						},
						stdio: ["ignore", "pipe", "pipe"],
					},
				);
				let visualLog = "";
				visual.stdout.on("data", (data) => {
					visualLog += data;
				});
				visual.stderr.on("data", (data) => {
					visualLog += data;
				});
				const visualExit = await new Promise((resolve, reject) => {
					visual.once("error", reject);
					visual.once("exit", resolve);
				});
				await writeFile(`${directory}/visual-${mode}.log`, visualLog);
				assert.equal(visualExit, 0, `${directory}/visual-${mode}.log`);
			}
			await singleHarness.close();
			singleHarness = null;
			await splitHarness.close();
			splitHarness = null;
			console.log(
				"1 Worker・2 Workerとも静的HTMLではコード実行0回。Chrome・WebKitのPC／モバイル表示が既存SSRと一致",
			);
		}
	}
	await assert.rejects(
		readFile(`${directory}/dist/client/ja/${handle}/first/index.html`),
	);
	await writeFile(
		`${directory}/result.json`,
		JSON.stringify(
			{
				results,
				limitations: [
					"未ビルドの非公開化は静的HTMLを削除しない",
					"静的ファイルはviewやコメントページのクエリを解釈しない",
				],
				directory,
			},
			null,
			2,
		),
	);
	console.log(`検証結果: ${directory}/result.json`);
} catch (error) {
	console.error(
		JSON.stringify({
			workerLogs: harness?.getLogs().slice(-15),
			singleLogs: singleHarness?.getLogs().slice(-15),
			splitLogs: splitHarness?.getLogs().slice(-15),
		}),
	);
	throw error;
} finally {
	await singleHarness?.close();
	await splitHarness?.close();
	await harness?.close();
	database.close();
	await new Promise((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
	await turso.stop();
}
