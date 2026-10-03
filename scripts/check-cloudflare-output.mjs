import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { unstable_dev } from "wrangler";

const databaseUrl = "postgres://postgres:postgres@db.localtest.me:5435/main";
const authSecret = "deployment-smoke-test-secret-32-characters";
const database = new Pool({ connectionString: databaseUrl });
const userId = randomUUID();
const token = randomUUID();
const handle = `worker-test-${userId}`;
const pageSlug = `worker-test-${userId}`;
const worker = await unstable_dev("dist/server/index.js", {
	config: "dist/server/wrangler.json",
	local: true,
	persist: false,
	logLevel: "error",
	vars: {
		SENTRY_DSN: "",
		DATABASE_URL: databaseUrl,
		BETTER_AUTH_SECRET: authSecret,
		BETTER_AUTH_URL: "http://localhost",
		AUTH_GOOGLE_ID: "deployment-smoke-google-id",
		AUTH_GOOGLE_SECRET: "deployment-smoke-google-secret",
		AUTH_RESEND_KEY: "re_deployment_smoke_test",
	},
	experimental: { disableExperimentalWarning: true, watch: false },
});
try {
	for (let request = 0; request < 2; request++) {
		const response = await worker.fetch(
			"http://localhost/api/auth/get-session",
		);
		assert.equal(response.status, 200);
		assert.equal(await response.text(), "null");
	}
	console.log("Workersランタイムで認証APIを繰り返し呼び出せる");
	await database.query(
		"INSERT INTO users (id, name, handle, email) VALUES ($1, $2, $3, $4)",
		[userId, "Worker Test", handle, `${userId}@example.test`],
	);
	await database.query(
		"INSERT INTO sessions (id, token, user_id, expires_at) VALUES ($1, $2, $3, $4)",
		[randomUUID(), token, userId, new Date(Date.now() + 3600000)],
	);
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
	const uploadFunction = functions.uploadEditorImage_createServerFn_handler;
	assert.ok(
		uploadFunction,
		"画像アップロードのServer Functionが生成されている",
	);
	const imageForm = new FormData();
	imageForm.set(
		"image",
		new File([await readFile("public/logo.png")], "logo.png", {
			type: "image/png",
		}),
	);
	const uploadRequest = new Request(
		`http://localhost/_serverFn/${uploadFunction}`,
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
		form.set("pageContent", `<p>${text}</p>`);
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
		const stored = await database.query(
			"SELECT status, mdast_json FROM pages WHERE slug = $1",
			[pageSlug],
		);
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
	const home = await worker.fetch("http://localhost/ja");
	assert.equal(home.status, 200);
	const html = await home.text();
	assert.ok(
		html.includes('data-sentry-component="HeroSection"'),
		"ホームの本文がSSRされている",
	);
	assert.ok(
		!/Sorry, an error occurred|Error in renderToReadableStream/.test(html),
		"ホームのSSRがエラーで中断されていない",
	);
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
		"WorkersランタイムでホームをSSRし、日本語フォントとロゴを使ったOG画像を生成できる",
	);
} finally {
	await worker.stop();
	await database.query(
		"DELETE FROM contents WHERE id IN (SELECT id FROM pages WHERE user_id = $1)",
		[userId],
	);
	await database.query("DELETE FROM users WHERE id = $1", [userId]);
	await database.end();
}
