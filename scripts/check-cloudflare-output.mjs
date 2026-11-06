import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { toJSONAsync } from "seroval";
import { createTestHarness } from "wrangler";
import { supportedLocaleOptions } from "../src/app/_constants/locale.ts";
import { startTursoServer } from "./turso-dev-server.mjs";

await mkdir(".data", { recursive: true });
const databasePath = `.data/deployment-${randomUUID()}.db`;
const localDatabase = createClient({ url: `file:${databasePath}` });
await migrate(drizzle(localDatabase), { migrationsFolder: "./src/drizzle" });
localDatabase.close();
execFileSync("bun", ["src/db/seed.ts"], {
	env: {
		...process.env,
		TURSO_DATABASE_URL: `file:${databasePath}`,
		TURSO_AUTH_TOKEN: "",
		SENTRY_DSN: "",
		VITE_SENTRY_DSN: "",
	},
	stdio: "pipe",
});
const tursoServer = await startTursoServer(databasePath, null);
const databaseUrl = tursoServer.url;
const authSecret = "deployment-smoke-test-secret-32-characters";
const database = createClient({ url: databaseUrl });
const queuedTranslations = [];
const queueServer = createServer(async (request, response) => {
	let body = "";
	for await (const chunk of request) body += chunk;
	queuedTranslations.push(JSON.parse(body));
	response.setHeader("Content-Type", "application/json");
	response.end(JSON.stringify({ messageId: randomUUID() }));
});
await new Promise((resolve) => queueServer.listen(0, "127.0.0.1", resolve));
const queueUrl = `http://127.0.0.1:${queueServer.address().port}`;

const userId = randomUUID();
const token = randomUUID();
const handle = `worker-test-${userId}`;
const pageSlug = `worker-test-${userId}`;
let worker;
let harness;
try {
	harness = createTestHarness({
		workers: [
			{
				configPath: "dist/server/wrangler.json",
				secrets: {
					SENTRY_DSN: "",
					TURSO_DATABASE_URL: databaseUrl,
					TURSO_AUTH_TOKEN: "",
					BETTER_AUTH_SECRET: authSecret,
					BETTER_AUTH_URL: "http://localhost",
					AUTH_GOOGLE_ID: "deployment-smoke-google-id",
					AUTH_GOOGLE_SECRET: "deployment-smoke-google-secret",
					AUTH_RESEND_KEY: "re_deployment_smoke_test",
					GOOGLE_ANALYTICS_ID: "G-0000000000",
					QSTASH_TOKEN: "deployment-smoke-queue-token",
					QSTASH_URL: queueUrl,
					QSTASH_PUBLISH_BASE_URL: "https://example.test",
				},
			},
			{
				configPath: "reader/dist/server/wrangler.json",
				secrets: { SENTRY_DSN: "" },
			},
		],
	});
	const { url: serverUrl } = await harness.listen();
	worker = harness.getWorker("evame-start");
	for (let request = 0; request < 2; request++) {
		const response = await worker.fetch(
			"http://localhost/api/auth/get-session",
		);
		assert.equal(response.status, 200);
		assert.equal(await response.text(), "null");
	}
	console.log("Workersランタイムで認証APIを繰り返し呼び出せる");
	await database.execute({
		sql: "INSERT INTO users (id, name, handle, email) VALUES (?, ?, ?, ?)",
		args: [userId, "Worker Test", handle, `${userId}@example.test`],
	});
	await database.execute({
		sql: "INSERT INTO sessions (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)",
		args: [randomUUID(), token, userId, Date.now() + 3600000],
	});
	const cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac("sha256", authSecret).update(token).digest("base64")}`)}`;
	const session = await worker.fetch("http://localhost/api/auth/get-session", {
		headers: { cookie },
	});
	assert.equal(session.status, 200);
	assert.equal((await session.json()).user.id, userId);
	const resolverFile = (await readdir("dist/server/assets")).find((name) =>
		name.startsWith("__23tanstack-start-server-fn-resolver-"),
	);
	assert.ok(resolverFile, "Server Functionのmanifestが生成されている");
	const resolver = await readFile(`dist/server/assets/${resolverFile}`, "utf8");
	const functions = Object.fromEntries(
		[
			...resolver.matchAll(
				/"([a-f0-9]{64})":\s*\{\s*functionName:\s*"([^"]+)"/g,
			),
		].map((match) => [match[2], match[1]]),
	);
	const editFunction = functions.editPageContent_createServerFn_handler;
	assert.ok(editFunction, "記事保存のServer Functionが生成されている");
	const imageForm = new FormData();
	imageForm.set(
		"image",
		new File([await readFile("public/logo.png")], "logo.png", {
			type: "image/png",
		}),
	);
	const uploadRequest = new Request(
		"http://localhost/api/reader-actions?action=uploadImage",
		{
			method: "POST",
			headers: { cookie, origin: "http://localhost", "x-tsr-serverFn": "true" },
			body: imageForm,
		},
	);
	const uploaded = await worker.fetch(uploadRequest.url, {
		method: uploadRequest.method,
		headers: Object.fromEntries(uploadRequest.headers),
		body: await uploadRequest.arrayBuffer(),
	});
	const uploadedBody = await uploaded.text();
	assert.equal(uploaded.status, 200, uploadedBody);
	const imageUrl = uploadedBody.match(/"https?:\/\/[^"]+"/)?.[0];
	assert.ok(imageUrl, uploadedBody);
	const uploadedUrl = new URL(JSON.parse(imageUrl));
	assert.equal(uploadedUrl.origin, "https://images.evame.tech");
	assert.ok(uploadedUrl.pathname.startsWith("/uploads/"), uploadedUrl.pathname);
	console.log(
		"WorkersランタイムでPNGをJPEGに変換し、R2へ画像をアップロードできる",
	);
	for (const text of ["Cloudflareで新規保存", "Cloudflareで更新保存"]) {
		const form = new FormData();
		form.set("pageSlug", pageSlug);
		form.set("userLocale", "ja");
		form.set("title", "Workers保存テスト");
		form.set(
			"pageContent",
			`<p>${text}</p><p><a href="https://x.com/example/status/123456789">X</a></p>`,
		);
		// NodeとWranglerのUndiciでFormDataの実装が異なるため、HTTP本文として渡す。
		const request = new Request(`http://localhost/_serverFn/${editFunction}`, {
			method: "POST",
			headers: { cookie, origin: "http://localhost", "x-tsr-serverFn": "true" },
			body: form,
		});
		const saved = await worker.fetch(request.url, {
			method: request.method,
			headers: Object.fromEntries(request.headers),
			body: await request.arrayBuffer(),
		});
		const savedBody = await saved.text();
		assert.equal(saved.status, 200, savedBody);
		const stored = await database.execute({
			sql: "SELECT status, mdast_json FROM pages WHERE slug = ?",
			args: [pageSlug],
		});
		assert.equal(stored.rows[0]?.status, "DRAFT", savedBody);
		assert.ok(
			JSON.stringify(stored.rows[0]?.mdast_json).includes(text),
			"保存した本文がDBに入っている",
		);
	}
	const editor = await worker.fetch(
		`http://localhost/ja/${handle}/${pageSlug}/edit`,
		{ headers: { cookie } },
	);
	const editorHtml = await editor.text();
	assert.equal(editor.status, 200, editorHtml);
	assert.ok(
		editorHtml.includes("Workers保存テスト"),
		"保存した記事を編集画面で再取得できる",
	);
	console.log(
		"Workersランタイムで認証済みセッションを検証し、非公開記事の新規保存・更新・編集画面を確認できる",
	);
	const childContent = await database.execute(
		"INSERT INTO contents (kind) VALUES ('PAGE') RETURNING id",
	);
	const childPageId = Number(childContent.rows[0].id);
	await database.execute({
		sql: "INSERT INTO pages (id, slug, source_locale, status, user_id, mdast_json, parent_id) SELECT ?, ?, source_locale, 'PUBLIC', user_id, mdast_json, id FROM pages WHERE slug = ?",
		args: [childPageId, `${pageSlug}-child`, pageSlug],
	});
	await database.execute({
		sql: "INSERT INTO segments (content_id, number, text, text_and_occurrence_hash) SELECT ?, number, text, text_and_occurrence_hash FROM segments WHERE content_id = (SELECT id FROM pages WHERE slug = ?)",
		args: [childPageId, pageSlug],
	});
	const article = await worker.fetch(
		`http://localhost/ja/${handle}/${pageSlug}`,
		{ headers: { cookie } },
	);
	const articleHtml = await article.text();
	assert.ok(
		articleHtml.includes('component-export="TweetsIsland"'),
		"埋め込み用islandを含む",
	);
	assert.ok(
		articleHtml.includes('data-tweet-id="123456789"'),
		"埋め込みだけを独立したislandで起動する",
	);
	assert.equal(article.status, 200, articleHtml);
	assert.ok(
		articleHtml.includes("Cloudflareで更新保存"),
		"記事本文をSSRできる",
	);
	console.log("Workersランタイムで保存した記事の閲覧ページを表示できる");
	const childArticle = await worker.fetch(
		`http://localhost/ja/${handle}/${pageSlug}-child`,
	);
	const childArticleHtml = await childArticle.text();
	assert.equal(childArticle.status, 200);
	assert.ok(
		childArticleHtml.includes("Cloudflareで更新保存"),
		"親記事のある記事でも本文をSSRできる",
	);
	assert.ok(
		childArticleHtml.includes('aria-label="page tree"'),
		"親記事のある記事で階層ナビゲーションをSSRできる",
	);
	console.log("親記事のある記事で本文と階層ナビゲーションをSSRできる");
	await database.execute({
		sql: "UPDATE pages SET status = 'PUBLIC' WHERE slug = ?",
		args: [pageSlug],
	});
	const storedPage = await database.execute({
		sql: "SELECT id FROM pages WHERE slug = ?",
		args: [pageSlug],
	});
	const commentIds = [];
	for (let index = 0; index < 22; index++) {
		const text =
			index === 21
				? "reply-marker-last"
				: `comment-marker-${String(index + 1).padStart(2, "0")}`;
		const content = await database.execute(
			"INSERT INTO contents (kind) VALUES ('PAGE_COMMENT') RETURNING id",
		);
		const id = Number(content.rows[0].id);
		await database.execute({
			sql: "INSERT INTO page_comments (id, page_id, user_id, parent_id, locale, mdast_json, created_at) VALUES (?, ?, ?, ?, 'ja', ?, ?)",
			args: [
				id,
				storedPage.rows[0].id,
				userId,
				index === 21 ? commentIds[20] : null,
				JSON.stringify({
					type: "root",
					children: [
						{ type: "paragraph", children: [{ type: "text", value: text }] },
					],
				}),
				Date.UTC(2026, 0, 1, 0, 0, index),
			],
		});
		await database.execute({
			sql: "INSERT INTO segments (content_id, number, text, text_and_occurrence_hash) VALUES (?, 0, ?, ?)",
			args: [id, text, text],
		});
		commentIds.push(id);
	}
	await database.execute({
		sql: "INSERT INTO segment_translations (segment_id, user_id, locale, text) SELECT id, ?, 'en', 'Existing English translation' FROM segments WHERE content_id = ? AND number = 1",
		args: [userId, storedPage.rows[0].id],
	});
	const publicArticle = await worker.fetch(
		`http://localhost/ja/${handle}/${pageSlug}`,
	);
	const publicArticleHtml = await publicArticle.text();
	assert.equal(publicArticle.status, 200, publicArticleHtml);
	assert.ok(
		publicArticleHtml.includes("Cloudflareで更新保存"),
		"ログインせずに公開記事の本文を読める",
	);
	assert.ok(
		publicArticleHtml.includes(">comment-marker-01<"),
		"最初のコメントをSSRする",
	);
	assert.ok(
		!publicArticleHtml.includes("comment-marker-21"),
		"21件目のスレッドを初回に取得しない",
	);
	assert.ok(
		publicArticleHtml.includes(
			`href="/ja/${handle}/${pageSlug}?page=2#comments"`,
		),
		"続きのコメントへのリンクを表示する",
	);
	const secondCommentPage = await worker.fetch(
		`http://localhost/ja/${handle}/${pageSlug}?page=2`,
	);
	assert.equal(secondCommentPage.status, 200);
	const secondCommentHtml = await secondCommentPage.text();
	assert.ok(
		secondCommentHtml.includes(">comment-marker-21<"),
		"2ページ目で21件目のコメントを読める",
	);
	assert.ok(
		secondCommentHtml.includes(">reply-marker-last<"),
		"2ページ目のコメントに付いた返信も読める",
	);
	assert.ok(
		!secondCommentHtml.includes("comment-marker-01"),
		"2ページ目では1ページ目のコメントを取得しない",
	);
	console.log(
		"Workersランタイムで20件ずつコメントをSSRし、続きのページと返信も表示できる",
	);
	const image = await worker.fetch(
		"http://localhost/api/og?slug=deployment-smoke-missing-page&locale=ja",
	);
	assert.equal(image.status, 200);
	assert.equal(image.headers.get("content-type"), "image/png");
	assert.deepEqual(
		new Uint8Array(await image.arrayBuffer()).slice(0, 8),
		new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
	);
	console.log("WorkersランタイムでDBに接続し、OG画像をPNGで生成できる");

	for (const { code: locale } of supportedLocaleOptions) {
		const response = await worker.fetch("http://localhost/" + locale);
		const html = await response.text();
		assert.equal(response.status, 200, html.slice(0, 500));
		assert.ok(
			html.includes("astro-island"),
			locale + ": AstroでHTMLを描画する",
		);
		assert.ok(
			!html.includes("about-section"),
			locale + ": トップに長い説明文を表示しない",
		);
		assert.ok(
			html.includes("Workers保存テスト"),
			locale + ": 最初のHTMLに記事一覧を含める",
		);
		assert.ok(
			!html.includes("better-auth.session_token="),
			locale + ": 認証セッションをHTMLに含めない",
		);
		assert.ok(
			html.includes("G-0000000000"),
			locale + ": Analytics設定を保持する",
		);
	}
	console.log(
		"全21言語で記事一覧を最初のAstro HTMLに含め、説明文をAboutに分離できる",
	);
	const about = await worker.fetch("http://localhost/ja/about");
	assert.equal(about.status, 200);
	assert.ok(
		(await about.text()).includes("about-section"),
		"Aboutで説明文を維持する",
	);
	if (process.env.EVAME_BROWSER_TEST === "true") {
		const { checkReaderBrowser } = await import("./check-reader-browser.mjs");
		await checkReaderBrowser(serverUrl.origin, cookie, handle, pageSlug);
		assert.equal(
			queuedTranslations.length,
			4,
			"コメント翻訳をローカルのキューへ投入する",
		);
	}
	const publicEdit = new FormData();
	publicEdit.set("pageSlug", pageSlug);
	publicEdit.set("userLocale", "ja");
	publicEdit.set("title", "Workers保存テスト");
	publicEdit.set("pageContent", "<p>公開記事を更新した本文</p>");
	const publicRequest = new Request(
		`http://localhost/_serverFn/${editFunction}`,
		{
			method: "POST",
			headers: { cookie, origin: "http://localhost", "x-tsr-serverFn": "true" },
			body: publicEdit,
		},
	);
	const publicSaved = await worker.fetch(publicRequest.url, {
		method: "POST",
		headers: Object.fromEntries(publicRequest.headers),
		body: await publicRequest.arrayBuffer(),
	});
	assert.equal(publicSaved.status, 200);
	const revised = await worker.fetch(
		`http://localhost/ja/${handle}/${pageSlug}`,
	);
	assert.equal(revised.status, 200);
	assert.ok(
		(await revised.text()).includes("公開記事を更新した本文"),
		"公開記事の保存後に本文HTMLを更新する",
	);
	const publishFunction = functions.togglePublishAction_createServerFn_handler;
	assert.ok(publishFunction, "公開状態を変更するServer Functionが生成される");
	const changed = await worker.fetch(
		"http://localhost/_serverFn/" + publishFunction,
		{
			method: "POST",
			headers: {
				cookie,
				origin: "http://localhost",
				"x-tsr-serverFn": "true",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(
				await toJSONAsync({
					data: { pageId: Number(storedPage.rows[0].id), locale: "ja" },
				}),
			),
		},
	);
	assert.equal(changed.status, 200, await changed.text());
	const hiddenArticle = await worker.fetch(
		"http://localhost/ja/" + handle + "/" + pageSlug,
	);
	assert.equal(
		hiddenArticle.status,
		404,
		"非公開にした記事をキャッシュに残さない",
	);
	const updatedHome = await worker.fetch("http://localhost/ja");
	assert.equal(updatedHome.status, 200);
	assert.ok(
		!(await updatedHome.text()).includes("Workers保存テスト"),
		"非公開にした記事を一覧から除外する",
	);
	console.log(
		"非公開化のHTTP処理でAstroキャッシュを無効化し、本文と一覧を更新できる",
	);
	const archiveFunction = functions.archivePageAction_createServerFn_handler;
	assert.ok(archiveFunction, "削除のServer Functionが生成される");
	for (const [action, expectedStatus] of [
		[publishFunction, 200],
		[archiveFunction, 404],
	]) {
		const result = await worker.fetch(`http://localhost/_serverFn/${action}`, {
			method: "POST",
			headers: {
				cookie,
				origin: "http://localhost",
				"x-tsr-serverFn": "true",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(
				await toJSONAsync({
					data: { pageId: Number(storedPage.rows[0].id), locale: "ja" },
				}),
			),
		});
		assert.equal(result.status, 200);
		const visible = await worker.fetch(
			`http://localhost/ja/${handle}/${pageSlug}`,
		);
		assert.equal(
			visible.status,
			expectedStatus,
			"削除後は本文の配信を停止する",
		);
	}
	console.log("公開後の本文更新・再公開・削除のHTTP操作をHTMLへ反映できる");
	const normalImage = await worker.fetch(
		"http://localhost/api/og?slug=evame-ja&locale=ja",
	);
	assert.equal(normalImage.status, 200);
	assert.equal(normalImage.headers.get("content-type"), "image/png");
	assert.deepEqual(
		new Uint8Array(await normalImage.arrayBuffer()).slice(0, 8),
		new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
	);
	console.log(
		"Workersランタイムで日本語フォントとロゴを使ったOG画像を生成できる",
	);
	const readerHome = await harness
		.getWorker("evame-reader")
		.fetch("http://localhost/ja");
	if (readerHome.headers.get("X-Evame-Cache") === "supported") {
		await tursoServer.stop();
		const withoutDb = await worker.fetch("http://localhost/ja", {
			headers: { cookie },
		});
		assert.equal(withoutDb.status, 200);
		assert.ok(
			(await withoutDb.text()).includes("astro-island"),
			"DB停止中もキャッシュ済みのトップを返す",
		);
		console.log("DB停止中もキャッシュ済みのAstroトップを表示できる");
	} else {
		assert.equal(readerHome.headers.get("Cache-Control"), "private, no-store");
		console.log(
			"キャッシュ無効化APIのないローカル環境では共有キャッシュを使わない（実CDNの命中・無効化はCloudflare上で検証）",
		);
	}
} finally {
	await harness?.close();
	await new Promise((resolve, reject) =>
		queueServer.close((error) => (error ? reject(error) : resolve())),
	);
	database.close();
	await tursoServer.stop();
	for (const suffix of ["", "-wal", "-shm"])
		await rm(databasePath + suffix, { force: true });
}
