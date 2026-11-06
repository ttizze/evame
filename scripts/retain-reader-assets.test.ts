// @vitest-environment node
import { execFile } from "node:child_process";
import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	utimes,
	writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(
	new URL("./retain-reader-assets.mjs", import.meta.url),
);
let directory: string;
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "evame-reader-assets-"));
	await mkdir(join(directory, "reader/dist/client/_astro"), {
		recursive: true,
	});
	await writeFile(
		join(directory, "reader/dist/client/_astro/new.abcdefgh.js"),
		"new asset",
	);
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

it("旧アセットの取得途中で失敗しても不完全な履歴を残さない", async () => {
	const server = createServer((request, response) => {
		if (request.url === "/ja")
			return response.end(
				'<astro-island component-url="/_astro/old.abcdefgh.js"></astro-island>',
			);
		if (request.url === "/_astro/old.abcdefgh.js")
			return response.end('import "./missing.abcdefgh.js";');
		response.statusCode = 503;
		response.end();
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("HTTP server address missing");
		await expect(
			promisify(execFile)(
				process.execPath,
				[script, `http://127.0.0.1:${address.port}`],
				{ cwd: directory },
			),
		).rejects.toThrow();
		expect(await readdir(join(directory, ".data/reader-assets"))).toEqual([]);
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	}
});

it("30日以内の旧アセットと新アセットを残し、期限切れの旧アセットを削除する", async () => {
	const cache = join(directory, ".data/reader-assets");
	await mkdir(cache, { recursive: true });
	await writeFile(join(cache, "old.abcdefgh.css"), "old css");
	await writeFile(join(cache, "expired.abcdefgh.js"), "expired");
	const expired = new Date(Date.now() - 31 * 86400000);
	await utimes(join(cache, "expired.abcdefgh.js"), expired, expired);
	await promisify(execFile)(process.execPath, [script, "http://127.0.0.1:9"], {
		cwd: directory,
	});
	expect(
		await readFile(
			join(directory, "reader/dist/client/_astro/old.abcdefgh.css"),
			"utf8",
		),
	).toBe("old css");
	expect(await readFile(join(cache, "new.abcdefgh.js"), "utf8")).toBe(
		"new asset",
	);
	await expect(readFile(join(cache, "expired.abcdefgh.js"))).rejects.toThrow();
});

it("初回は公開HTMLとJSの依存先を取得し、旧HTMLから参照されるアセットを残す", async () => {
	const resources = new Map([
		[
			"/ja",
			'<astro-island component-url="/_astro/old.abcdefgh.js"></astro-island><a href="/ja/author/article">article</a><a href="https://example.invalid/private">external</a>',
		],
		[
			"/ja/author/article",
			'<astro-island component-url="/_astro/comments.abcdefgh.js"></astro-island>',
		],
		["/_astro/old.abcdefgh.js", 'import "./shared.abcdefgh.js";'],
		["/_astro/shared.abcdefgh.js", "shared"],
		["/_astro/comments.abcdefgh.js", "comments"],
	]);
	const server = createServer((request, response) => {
		expect(request.headers.cookie).toBeUndefined();
		const body = resources.get(request.url ?? "");
		response.statusCode = body === undefined ? 404 : 200;
		response.end(body);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("HTTP server address missing");
		await promisify(execFile)(
			process.execPath,
			[script, `http://127.0.0.1:${address.port}`],
			{ cwd: directory },
		);
		for (const name of ["old", "shared", "comments"])
			expect(
				await readFile(
					join(directory, `reader/dist/client/_astro/${name}.abcdefgh.js`),
					"utf8",
				),
			).toBe(resources.get(`/_astro/${name}.abcdefgh.js`));
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	}
});
