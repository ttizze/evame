import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { toJSONAsync } from "seroval";
import { createTestHarness } from "wrangler";
import { startTursoServer } from "./turso-dev-server.mjs";

const id = randomUUID();
const directory = resolve(`.data/reader-connected-${id}`);
await mkdir(directory, { recursive: true, mode: 0o700 });
const remote = process.env.CONNECTED_PREVIEW_ORIGIN;
const previewSecrets = remote
	? JSON.parse(process.env.EVAME_PREVIEW_SECRETS ?? "null")
	: null;
const databaseUrl =
	previewSecrets?.TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
const databaseToken =
	previewSecrets?.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
if (remote) {
	assert.match(
		remote,
		/^https:\/\/pr-[1-9]\d*-evame-start\.[a-z0-9-]+\.workers\.dev$/,
	);
	assert.match(
		databaseUrl ?? "",
		/^libsql:\/\/evame-preview-[a-z0-9.-]+\.turso\.io$/,
		"専用Preview DBだけを使用する",
	);
}
const authSecret = remote
	? (previewSecrets?.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET)
	: "reader-connected-local-secret-32-characters";
assert.ok(authSecret);
let database;
let turso;
let harness;
let config;
const results = [];
const userId = `connected-${id}`;
const handle = `connected-${id.slice(0, 8)}`;
const slug = `記事-${id.slice(0, 8)}`;
const prefix = `reader-connected/${id}`;
const origin = remote ?? "http://localhost";
let gateway;
let publicationBucket;
let browserOrigin = remote;
let failure;
try {
	if (remote)
		database = createClient({
			url: databaseUrl,
			authToken: databaseToken,
		});
	else {
		const file = `${directory}/test.db`;
		const local = createClient({ url: `file:${file}` });
		await migrate(drizzle(local), { migrationsFolder: "src/drizzle" });
		local.close();
		turso = await startTursoServer(file, null);
		database = createClient({ url: turso.url });
		execFileSync("bun", ["src/db/seed.ts"], {
			env: {
				...process.env,
				TURSO_DATABASE_URL: turso.url,
				TURSO_AUTH_TOKEN: "",
				SENTRY_DSN: "",
				VITE_SENTRY_DSN: "",
			},
			stdio: "pipe",
		});
		config = `reader/dist/server/connected-${id}.json`;
		const base = JSON.parse(
			await readFile("reader/dist/server/wrangler.json", "utf8"),
		);
		await writeFile(
			config,
			JSON.stringify({
				...base,
				r2_buckets: [
					{ binding: "HTML", bucket_name: "reader-connected-local" },
				],
			}),
		);
		harness = createTestHarness({
			workers: [
				{ configPath: "gateway/dist/wrangler.json" },
				{
					configPath: "dist/server/wrangler.json",
					secrets: {
						TURSO_DATABASE_URL: turso.url,
						TURSO_AUTH_TOKEN: "",
						BETTER_AUTH_SECRET: authSecret,
						BETTER_AUTH_URL: origin,
						AUTH_RESEND_KEY: "re_connected_test",
						AUTH_GOOGLE_ID: "",
						AUTH_GOOGLE_SECRET: "",
						SENTRY_DSN: "",
						READER_PUBLICATION_PREFIX: prefix,
					},
				},
				{
					configPath: config,
					secrets: { SENTRY_DSN: "", READER_PUBLICATION_PREFIX: prefix },
				},
			],
		});
		browserOrigin = (await harness.listen()).url.origin;
		gateway = harness.getWorker("evame-gateway");
		publicationBucket = (await harness.getWorker("evame-reader").getEnv()).HTML;
	}
	const token = randomUUID();
	await database.execute({
		sql: "INSERT INTO users (id,name,search_name,handle,email) VALUES (?, '配信接続の検証', 'connected', ?, ?)",
		args: [userId, handle, `${userId}@example.test`],
	});
	await database.execute({
		sql: "INSERT INTO sessions (id,token,user_id,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?)",
		args: [
			randomUUID(),
			token,
			userId,
			Date.now() + 86400000,
			Date.now(),
			Date.now(),
		],
	});
	const cookie = `${remote ? "__Secure-" : ""}better-auth.session_token=${encodeURIComponent(`${token}.${createHmac("sha256", authSecret).update(token).digest("base64")}`)}`;
	const request = async (path, init = {}) => {
		if (remote)
			return fetch(new URL(path, origin), {
				...init,
				signal: AbortSignal.timeout(60000),
			});
		const outgoing = new Request(new URL(path, origin), init);
		return gateway.fetch(outgoing.url, {
			method: outgoing.method,
			headers: Object.fromEntries(outgoing.headers),
			...(outgoing.body ? { body: await outgoing.arrayBuffer() } : {}),
			redirect: "manual",
		});
	};
	const resolverFile = (await readdir("dist/server/assets")).find(
		(path) => path.includes("server-fn-resolver-") && path.endsWith(".js"),
	);
	assert.ok(resolverFile);
	const resolver = await readFile(`dist/server/assets/${resolverFile}`, "utf8");
	const functions = Object.fromEntries(
		[
			...resolver.matchAll(
				/"([a-f0-9]{64})":\s*\{\s*functionName:\s*"([^"]+)"/g,
			),
		].map((match) => [match[2], match[1]]),
	);
	const edit = functions.editPageContent_createServerFn_handler;
	assert.ok(edit);
	const save = async (text, title = "配信接続の記事") => {
		const form = new FormData();
		for (const [key, value] of Object.entries({
			pageSlug: slug,
			userLocale: "ja",
			title,
			pageContent: `<h2>検証する見出し</h2><p>${text}</p>`,
		}))
			form.set(key, value);
		const started = performance.now();
		const response = await request(`/_serverFn/${edit}`, {
			method: "POST",
			headers: { cookie, origin, "x-tsr-serverFn": "true" },
			body: form,
		});
		results.push({
			operation: "save",
			status: response.status,
			milliseconds: Math.round(performance.now() - started),
		});
		return response;
	};
	assert.equal((await save("最初の原稿")).status, 200);
	const page = await database.execute({
		sql: "SELECT id FROM pages WHERE user_id=? AND slug=?",
		args: [userId, slug],
	});
	const pageId = Number(page.rows[0].id);
	const path = `/ja/${handle}/${encodeURIComponent(slug)}`;
	const action = async (name) => {
		assert.ok(functions[name]);
		const response = await request(`/_serverFn/${functions[name]}`, {
			method: "POST",
			headers: {
				cookie,
				origin,
				"x-tsr-serverFn": "true",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(
				await toJSONAsync({ data: { pageId, locale: "ja" } }),
			),
		});
		assert.equal(response.status, 200, await response.text());
	};
	await action("togglePublishAction_createServerFn_handler");
	for (const target of [
		path,
		`/en/${handle}/${encodeURIComponent(slug)}?view=source`,
		"/ja",
	]) {
		const first = await request(target);
		assert.equal(first.status, 200, await first.clone().text());
		await first.arrayBuffer();
		const second = await request(target);
		assert.equal(second.headers.get("X-Evame-HTML"), "publication");
		await second.arrayBuffer();
	}
	assert.equal(
		(await save("保存応答の直後の本文", "更新した題名")).status,
		200,
	);
	for (const target of [path, `${path}?view=source`, `${path}?page=2`]) {
		const response = await request(target);
		assert.equal(response.status, 200);
		assert.ok((await response.text()).includes("保存応答の直後の本文"));
	}
	if (publicationBucket) {
		const generation =
			(await publicationBucket.head(`${prefix}/generation`))?.etag ?? "initial";
		const key = `${prefix}/html/${generation}/${Math.floor(Date.now() / 3600000)}/${encodeURIComponent(origin + path)}`;
		const previous = await publicationBucket.get(key);
		assert.ok(previous);
		await publicationBucket.put(key, await previous.text(), {
			customMetadata: { revision: "invalid" },
		});
		const failed = await save("失敗後に再送する本文");
		assert.ok(failed.status >= 500, "R2保存の失敗を保存成功にしない");
		assert.ok(
			(await database.execute("SELECT tag FROM reader_cache_invalidations"))
				.rows.length > 0,
		);
		await publicationBucket.delete(key);
		assert.equal((await save("失敗後に再送する本文")).status, 200);
		assert.equal(
			(await database.execute("SELECT tag FROM reader_cache_invalidations"))
				.rows.length,
			0,
		);
	}
	for (const response of await Promise.all([
		save("並行保存の本文A"),
		save("並行保存の本文B"),
	]))
		assert.equal(response.status, 200, await response.text());
	const stored = await database.execute({
		sql: "SELECT mdast_json FROM pages WHERE id=?",
		args: [pageId],
	});
	const storedText = JSON.stringify(JSON.parse(stored.rows[0].mdast_json));
	const confirmed = ["並行保存の本文A", "並行保存の本文B"].find((text) =>
		storedText.includes(text),
	);
	assert.ok(confirmed, "DBに確定した並行保存の本文を取得する");
	const html = await (await request(path)).text();
	assert.ok(html.includes(confirmed), "公開HTMLがDBの確定本文と一致する");
	assert.ok(
		!html.includes(
			confirmed === "並行保存の本文A" ? "並行保存の本文B" : "並行保存の本文A",
		),
	);
	if (process.env.EVAME_CONNECTED_BROWSER === "true") {
		const { chromium, webkit, expect } = await import("@playwright/test");
		for (const type of [chromium, webkit]) {
			const browser = await type.launch();
			try {
				for (const width of [1280, 390]) {
					const context = await browser.newContext({
						viewport: { width, height: 900 },
					});
					await context.addCookies([
						{
							name: cookie.slice(0, cookie.indexOf("=")),
							value: cookie.slice(cookie.indexOf("=") + 1),
							url: browserOrigin,
							httpOnly: true,
							sameSite: "Lax",
						},
					]);
					const page = await context.newPage();
					await page.goto(new URL(`${path}/edit`, browserOrigin).href);
					const editor = page.locator(
						'[data-testid="lexical-editor"][contenteditable=true]',
					);
					await expect(editor).toContainText(confirmed);
					await editor.locator("p").last().click();
					const text = `ブラウザーから保存-${type.name()}-${width}`;
					const saved = page.waitForResponse(
						(response) =>
							response.url().includes(`/_serverFn/${edit}`) &&
							response.request().method() === "POST",
					);
					await page.keyboard.press("End");
					await page.keyboard.insertText(text);
					assert.equal((await saved).status(), 200);
					await page.reload();
					await expect(editor).toContainText(text);
					await page.goto(new URL(path, browserOrigin).href);
					await expect(page.locator("main")).toContainText(text);
					await page.screenshot({
						path: `${directory}/${type.name()}-${width}.png`,
						fullPage: true,
					});
					await context.close();
				}
			} finally {
				await browser.close();
			}
		}
	}
	await action("togglePublishAction_createServerFn_handler");
	assert.equal((await request(path)).status, 404);
	assert.equal(
		(await request(`/en/${handle}/${encodeURIComponent(slug)}?view=source`))
			.status,
		404,
	);
	assert.ok(!(await (await request("/ja")).text()).includes("更新した題名"));
	const draft = await request(path, { headers: { cookie } });
	assert.equal(draft.status, 200);
	assert.notEqual(draft.headers.get("X-Evame-HTML"), "publication");
	await draft.arrayBuffer();
	await action("togglePublishAction_createServerFn_handler");
	await action("archivePageAction_createServerFn_handler");
	assert.equal((await request(path)).status, 404);
	console.log(
		"実際の保存・公開・並行保存・非公開化・削除をAstro生成とR2配信へ接続しました",
	);
} catch (error) {
	failure = error;
}
const cleanupErrors = [];
for (const cleanup of [
	async () => {
		if (database)
			await database.execute({
				sql: "DELETE FROM users WHERE id=?",
				args: [userId],
			});
	},
	async () => {
		if (
			remote &&
			process.env.CONNECTED_PREVIEW_READER_ORIGIN &&
			previewSecrets?.PREVIEW_READER_SECRET
		) {
			const response = await fetch(
				new URL(
					"/__publication-cleanup",
					process.env.CONNECTED_PREVIEW_READER_ORIGIN,
				),
				{
					method: "POST",
					headers: {
						"x-evame-preview-reader": previewSecrets.PREVIEW_READER_SECRET,
					},
					signal: AbortSignal.timeout(30000),
				},
			);
			assert.equal(response.status, 204, "検証で保存したR2 prefixを片付ける");
		}
	},
	async () => {
		database?.close();
	},
	async () => {
		await harness?.close();
	},
	async () => {
		await turso?.stop();
	},
	async () => {
		if (config) await rm(config, { force: true });
	},
	async () => {
		await writeFile(
			`${directory}/result.json`,
			JSON.stringify({ results, remote: Boolean(remote) }, null, 2),
		);
		console.log(`検証結果: ${directory}/result.json`);
	},
]) {
	try {
		await cleanup();
	} catch (error) {
		cleanupErrors.push(error);
	}
}
if (cleanupErrors.length)
	throw new AggregateError(
		failure ? [failure, ...cleanupErrors] : cleanupErrors,
		"接続検証の後片付けに失敗しました",
	);
if (failure) throw failure;
