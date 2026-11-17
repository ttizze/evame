import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { R2Bucket } from "@cloudflare/workers-types";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { readerCacheTags } from "../_domain/reader-cache-tags";
import { fetchReaderAsset } from "./reader-asset";
import { fetchReaderHtml, publishReaderChanges } from "./reader-html";

const directory = await mkdtemp(join(tmpdir(), "evame-r2-"));
const configPath = join(directory, "wrangler.json");
await writeFile(
	configPath,
	JSON.stringify({
		name: "reader-html-test",
		compatibility_date: "2026-10-03",
		r2_buckets: [{ binding: "HTML", bucket_name: "reader-html-test" }],
	}),
);
const runtime = await getPlatformProxy<{ HTML: R2Bucket }>({
	configPath,
	persist: false,
});
const bucket = runtime.env.HTML;
afterAll(async () => {
	await runtime.dispose();
	await rm(directory, { recursive: true, force: true });
});
beforeEach(async () => {
	const objects = await bucket.list();
	await bucket.delete(objects.objects.map((row) => row.key));
});
const databaseUrl = "libsql://reader-test.turso.io";
const request = new Request("https://evame.test/ja/author/article");
const tags = await readerCacheTags(["page:1", "author:author"]);
const render = vi.fn(async (_request: Request) => ({
	revision: 1,
	response: new Response("公開本文", {
		headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
	}),
}));
beforeEach(() => render.mockClear());
const serve = (input = request) =>
	fetchReaderHtml(input, bucket, databaseUrl, render);

it("保存した公開HTMLはDB取得やAstro生成なしで返す", async () => {
	expect(await (await serve()).text()).toBe("公開本文");
	const response = await serve();
	expect(await response.text()).toBe("公開本文");
	expect(response.headers.get("X-Evame-HTML-Cache")).toBe("HIT");
	expect(render).toHaveBeenCalledTimes(1);
});
it("公開HTMLのHITはR2のGET一回で返し変更記録をLISTしない", async () => {
	await serve();
	const get = vi.fn(bucket.get.bind(bucket));
	const list = vi.fn(bucket.list.bind(bucket));
	const instrumented = {
		get,
		list,
		put: bucket.put.bind(bucket),
		delete: bucket.delete.bind(bucket),
	};
	const response = await fetchReaderHtml(
		request,
		instrumented,
		databaseUrl,
		render,
	);
	expect(await response.text()).toBe("公開本文");
	expect(response.headers.get("X-Evame-HTML-Cache")).toBe("HIT");
	expect(get).toHaveBeenCalledTimes(1);
	expect(list).not.toHaveBeenCalled();
});
it("生成中の新しいURLを保存側が無効にし遅い本文の再登録を防ぐ", async () => {
	const started = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	render.mockImplementationOnce(async () => {
		started.resolve();
		await release.promise;
		return {
			revision: 1,
			response: new Response("遅い公開本文", {
				headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
			}),
		};
	});
	const delayed = serve();
	await started.promise;
	const registered = await bucket.list({ prefix: "pending/" });
	expect(registered.objects).toHaveLength(1);
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	release.resolve();
	await delayed;
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});
it("本文の変更記録があると古いHTMLを使わず最新の本文へ差し替える", async () => {
	await serve();
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("更新した本文", {
			headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
		}),
	});
	expect(await (await serve()).text()).toBe("更新した本文");
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("更新した本文", {
			headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
		}),
	});
	expect(await (await serve()).text()).toBe("更新した本文");
});
it("非公開化した後に同じURLへ戻っても本文を再配信しない", async () => {
	await serve(request);
	await serve(request);
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve(request)).status).toBe(404);
});
it("無関係な記事の変更では公開HTMLを再生成しない", async () => {
	await serve();
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:2", revision: 2 },
	]);
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
	expect(render).toHaveBeenCalledTimes(1);
});
it("新しい変更記録の後に古い記録が届いても非公開化を巻き戻さない", async () => {
	await serve();
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 3 },
	]);
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	render.mockResolvedValueOnce({
		revision: 3,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});
it("非公開化より前に始まった遅いHTML生成が終わっても次の閲覧で古い本文を返さない", async () => {
	let release!: () => void;
	const barrier = new Promise<void>((resolve) => {
		release = resolve;
	});
	render.mockImplementationOnce(async () => {
		await barrier;
		return {
			revision: 1,
			response: new Response("古い公開本文", {
				headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
			}),
		};
	});
	const delayed = serve();
	await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	release();
	await delayed;
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});
it.each([404, 500])("HTTP %iの応答を公開HTMLへ保存しない", async (status) => {
	render.mockResolvedValueOnce({
		revision: 1,
		response: new Response("error", { status }),
	});
	expect((await serve()).status).toBe(status);
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("MISS");
	expect(render).toHaveBeenCalledTimes(2);
});
it("所有者の下書きプレビューと検索などの私的な応答を保存しない", async () => {
	render.mockResolvedValueOnce({
		revision: 1,
		response: new Response("非公開の原稿", {
			headers: {
				"Content-Type": "text/html",
				"Cache-Control": "private, no-store",
			},
		}),
	});
	await serve();
	for (const object of (await bucket.list({ prefix: "html/" })).objects)
		expect(await (await bucket.get(object.key))?.text()).not.toContain(
			"非公開の原稿",
		);
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("MISS");
});
it("認証情報や個人Cookieを応答するHTMLを共有保存しない", async () => {
	render.mockResolvedValueOnce({
		revision: 1,
		response: new Response("個人情報", {
			headers: {
				"Content-Type": "text/html",
				"Cache-Tag": tags.join(","),
				"Set-Cookie": "session=private",
			},
		}),
	});
	await serve();
	for (const object of (await bucket.list({ prefix: "html/" })).objects)
		expect(await (await bucket.get(object.key))?.text()).not.toContain(
			"session=private",
		);
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("MISS");
});
it("HEADのコールドミスでもGETで本文を生成し次のGETへ空本文を残さない", async () => {
	const response = await serve(new Request(request, { method: "HEAD" }));
	expect(await response.text()).toBe("");
	expect(render.mock.calls[0]?.[0]?.method).toBe("GET");
	expect(await (await serve()).text()).toBe("公開本文");
});
it("URLのクエリが異なるHTMLは別々に保存する", async () => {
	await serve();
	await serve(new Request(`${request.url}?view=source`));
	expect((await serve(request)).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
	expect(render).toHaveBeenCalledTimes(2);
});
it("1年経過しても表示データの変更がなければ保存HTMLを返す", async () => {
	const now = Date.now();
	const clock = vi.spyOn(Date, "now").mockReturnValue(now);
	try {
		await serve();
		clock.mockReturnValue(now + 366 * 86400000);
		expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
		expect(render).toHaveBeenCalledTimes(1);
	} finally {
		clock.mockRestore();
	}
});
it("変更記録の作成を再試行しても同じ版を重複保存しない", async () => {
	const changes = [{ key: "page:1", revision: 2 }];
	await publishReaderChanges(bucket, databaseUrl, changes);
	await publishReaderChanges(bucket, databaseUrl, changes);
	expect((await bucket.list({ prefix: "changes/" })).objects).toHaveLength(1);
});
it("保存側の無効化対象を読み取れないときは反映成功を返さない", async () => {
	await serve();
	const broken = {
		head: bucket.head.bind(bucket),
		list: vi.fn().mockRejectedValue(new Error("R2 unavailable")),
		put: bucket.put.bind(bucket),
		delete: bucket.delete.bind(bucket),
	};
	await expect(
		publishReaderChanges(broken, databaseUrl, [{ key: "page:1", revision: 2 }]),
	).rejects.toThrow("R2 unavailable");
});

it("別のPreviewへ届いた更新記録を公開HTMLへ適用しない", async () => {
	await serve();
	await publishReaderChanges(bucket, "libsql://another-preview.turso.io", [
		{ key: "page:1", revision: 2 },
	]);
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
	expect(render).toHaveBeenCalledTimes(1);
});
it("同じURLでもDBが異なる場合はHTMLを共有しない", async () => {
	await serve();
	render.mockResolvedValueOnce({
		revision: 0,
		response: new Response("別のPreviewの本文", {
			headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
		}),
	});
	const response = await fetchReaderHtml(
		request,
		bucket,
		"libsql://another-preview.turso.io",
		render,
	);
	expect(await response.text()).toBe("別のPreviewの本文");
	expect(response.headers.get("X-Evame-HTML-Cache")).toBe("MISS");
	expect(await (await serve()).text()).toBe("公開本文");
});
it("DBのURLをHTMLと変更記録のオブジェクトキーへ残さない", async () => {
	await serve();
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	const objects = (await bucket.list()).objects;
	expect(objects.some((row) => row.key.startsWith("html/"))).toBe(true);
	expect(objects.some((row) => row.key.startsWith("changes/"))).toBe(true);
	for (const object of objects)
		expect(object.key).not.toContain("reader-test.turso.io");
});
it("DBの識別情報がない場合はHTMLと変更記録を共有しない", async () => {
	await expect(fetchReaderHtml(request, bucket, "", render)).rejects.toThrow(
		"TURSO_DATABASE_URL is not defined",
	);
	await expect(
		publishReaderChanges(bucket, "", [{ key: "page:1", revision: 2 }]),
	).rejects.toThrow("TURSO_DATABASE_URL is not defined");
	expect(render).not.toHaveBeenCalled();
	expect((await bucket.list()).objects).toHaveLength(0);
});
it("保存側はLISTの続きも取得して後半の公開HTMLを無効化する", async () => {
	await serve();
	let paginated = false;
	const list = vi.fn(async (options: Parameters<typeof bucket.list>[0]) => {
		if (options?.prefix?.startsWith("dependencies/") && !paginated) {
			paginated = true;
			return {
				objects: [],
				truncated: true as const,
				cursor: "more",
				delimitedPrefixes: [],
			};
		}
		return bucket.list(
			options?.cursor === "more" ? { ...options, cursor: undefined } : options,
		);
	});
	await publishReaderChanges(
		{
			head: bucket.head.bind(bucket),
			list,
			put: bucket.put.bind(bucket),
			delete: bucket.delete.bind(bucket),
		},
		databaseUrl,
		[{ key: "page:1", revision: 2 }],
	);
	expect(list.mock.calls.some(([options]) => options?.cursor === "more")).toBe(
		true,
	);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
	expect(render).toHaveBeenCalledTimes(2);
});
it("遅い旧HTMLの保存が並行した新HTMLを上書きしない", async () => {
	const barrier = Promise.withResolvers<void>();
	render.mockImplementationOnce(async () => {
		await barrier.promise;
		return {
			revision: 1,
			response: new Response("古い本文", {
				headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
			}),
		};
	});
	const old = serve();
	await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("新しい本文", {
			headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
		}),
	});
	await serve();
	barrier.resolve();
	await old;
	expect(await (await serve()).text()).toBe("新しい本文");
});
it("生成に時間がかかっても保存後のHTMLに有効期限を設けない", async () => {
	const now = Date.now();
	const clock = vi.spyOn(Date, "now").mockReturnValue(now);
	try {
		render.mockImplementationOnce(async () => {
			clock.mockReturnValue(now + 3599000);
			return {
				revision: 1,
				response: new Response("公開本文", {
					headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
				}),
			};
		});
		await serve();
		clock.mockReturnValue(now + 3600001);
		expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
		expect(render).toHaveBeenCalledTimes(1);
	} finally {
		clock.mockRestore();
	}
});

it.each([
	Number.NaN,
	-1,
	Number.POSITIVE_INFINITY,
	Number.MAX_SAFE_INTEGER + 1,
])("更新版が不正な値 %s のHTMLは共有保存しない", async (revision) => {
	render.mockResolvedValueOnce({
		revision,
		response: new Response("本文", {
			headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
		}),
	});
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("BYPASS");
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("MISS");
	expect(render).toHaveBeenCalledTimes(2);
});

it("生成元の変更不可ヘッダーを直接変更せず保存対象外のHTMLを返す", async () => {
	render.mockResolvedValueOnce({
		revision: 1,
		response: await fetch("data:text/html,public"),
	});
	const response = await serve();
	expect(response.status).toBe(200);
	expect(response.headers.get("X-Evame-HTML-Cache")).toBe("BYPASS");
	expect(await response.text()).toBe("public");
});

it("変更記録を保存済みでもHTMLの無効化に失敗したら再試行で回復する", async () => {
	await serve();
	const put = vi.fn(async (...args: Parameters<typeof bucket.put>) => {
		if (args[0].startsWith("html/"))
			throw new Error("R2 invalidation unavailable");
		return bucket.put(...args);
	});
	const changes = [{ key: "page:1", revision: 2 }];
	await expect(
		publishReaderChanges(
			{
				head: bucket.head.bind(bucket),
				list: bucket.list.bind(bucket),
				put,
				delete: bucket.delete.bind(bucket),
			},
			databaseUrl,
			changes,
		),
	).rejects.toThrow("R2 invalidation unavailable");
	await publishReaderChanges(bucket, databaseUrl, changes);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("回復後の本文", {
			headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
		}),
	});
	expect(await (await serve()).text()).toBe("回復後の本文");
});

it("無効化対象のLIST後に生成が完了しても古い本文を取りこぼさない", async () => {
	const started = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	render.mockImplementationOnce(async () => {
		started.resolve();
		await release.promise;
		return {
			revision: 1,
			response: new Response("遅い本文", {
				headers: { "Content-Type": "text/html", "Cache-Tag": tags.join(",") },
			}),
		};
	});
	const delayed = serve();
	await started.promise;
	const list = async (...args: Parameters<typeof bucket.list>) => {
		const snapshot = await bucket.list(...args);
		release.resolve();
		await delayed;
		return snapshot;
	};
	await publishReaderChanges(
		{
			head: bucket.head.bind(bucket),
			list,
			put: bucket.put.bind(bucket),
			delete: bucket.delete.bind(bucket),
		},
		databaseUrl,
		[{ key: "page:1", revision: 2 }],
	);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});

it("無効化対象のLIST後に新しい版が完成しても新しいHTMLを消さない", async () => {
	await serve();
	let replaced = false;
	const list = async (...args: Parameters<typeof bucket.list>) => {
		const snapshot = await bucket.list(...args);
		if (replaced || snapshot.objects.length === 0) return snapshot;
		replaced = true;
		const reference = snapshot.objects[0];
		const htmlKey = reference.customMetadata!.htmlKey;
		const stored = await bucket.get(htmlKey);
		const html = await stored!.json<Record<string, unknown>>();
		const generation = crypto.randomUUID();
		const [namespace] = await readerCacheTags([databaseUrl]);
		for (const tag of tags)
			await bucket.put(`dependencies/${namespace}/${tag}/${generation}`, "", {
				customMetadata: { htmlKey, generation },
			});
		await bucket.put(
			htmlKey,
			JSON.stringify({
				...html,
				generation,
				body: "最新の本文",
			}),
			{
				customMetadata: { state: "ready", revision: "3", generation },
			},
		);
		return snapshot;
	};
	await publishReaderChanges(
		{
			head: bucket.head.bind(bucket),
			list,
			put: bucket.put.bind(bucket),
			delete: bucket.delete.bind(bucket),
		},
		databaseUrl,
		[{ key: "page:1", revision: 2 }],
	);
	expect(await (await serve()).text()).toBe("最新の本文");
	expect(render).toHaveBeenCalledTimes(1);
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 4 },
	]);
	render.mockResolvedValueOnce({
		revision: 4,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});

it("依存タグが多くても各キーの索引から変更した本文を再生成する", async () => {
	const largeTags = await readerCacheTags(
		Array.from({ length: 40 }, (_, index) => `page:${index}`),
	);
	render.mockResolvedValueOnce({
		revision: 1,
		response: new Response("依存の多い本文", {
			headers: {
				"Content-Type": "text/html",
				"Cache-Tag": largeTags.join(","),
			},
		}),
	});
	await serve();
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:39", revision: 2 },
	]);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});

it("生成中の登録に失敗したときは無効化できない生成を開始しない", async () => {
	const broken = {
		get: bucket.get.bind(bucket),
		put: vi.fn().mockRejectedValue(new Error("R2 registration unavailable")),
		delete: bucket.delete.bind(bucket),
	};
	await expect(
		fetchReaderHtml(request, broken, databaseUrl, render),
	).rejects.toThrow("R2 registration unavailable");
	expect(render).not.toHaveBeenCalled();
});

it("保存時は依存するURLと生成中のURLだけを調べHTML全体をLISTしない", async () => {
	await serve();
	const list = vi.fn(bucket.list.bind(bucket));
	await publishReaderChanges(
		{
			head: bucket.head.bind(bucket),
			list,
			put: bucket.put.bind(bucket),
			delete: bucket.delete.bind(bucket),
		},
		databaseUrl,
		[{ key: "page:1", revision: 2 }],
	);
	expect(
		list.mock.calls.some(([options]) => options?.prefix?.startsWith("html/")),
	).toBe(false);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve()).status).toBe(404);
});

it.each([
	"429 Too Many Requests",
	"put: The rate of requests exceeds the allowed maximum (10058)",
])(
	"HTMLの並行保存が%sでも閲覧を失敗させず次の生成で回復する",
	async (message) => {
		let limited = true;
		const put = vi.fn(async (...args: Parameters<typeof bucket.put>) => {
			if (args[0].startsWith("html/") && limited) {
				limited = false;
				throw new Error(message);
			}
			return bucket.put(...args);
		});
		const observed = {
			get: bucket.get.bind(bucket),
			put,
			delete: bucket.delete.bind(bucket),
		};
		expect(
			await (
				await fetchReaderHtml(request, observed, databaseUrl, render)
			).text(),
		).toBe("公開本文");
		expect(
			await (
				await fetchReaderHtml(request, observed, databaseUrl, render)
			).text(),
		).toBe("公開本文");
		expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
	},
);

it("無関係な公開HTMLが100件増えても保存のLISTとHEAD回数を増やさない", async () => {
	await serve();
	const [namespace, unrelatedTag] = await readerCacheTags([
		databaseUrl,
		"page:unrelated",
	]);
	const list = vi.fn(bucket.list.bind(bucket));
	const head = vi.fn(bucket.head.bind(bucket));
	const observed = {
		list,
		head,
		put: bucket.put.bind(bucket),
		delete: bucket.delete.bind(bucket),
	};
	await publishReaderChanges(observed, databaseUrl, [
		{ key: "page:missing-a", revision: 2 },
	]);
	const counts = { list: list.mock.calls.length, head: head.mock.calls.length };
	list.mockClear();
	head.mockClear();
	for (let index = 0; index < 100; index++) {
		const generation = crypto.randomUUID();
		const htmlKey = `html/${namespace}/other-build/${index}`;
		await bucket.put(htmlKey, "unrelated", {
			customMetadata: { state: "ready", revision: "1", generation },
		});
		await bucket.put(
			`dependencies/${namespace}/${unrelatedTag}/${generation}`,
			"",
			{ customMetadata: { htmlKey, generation } },
		);
	}
	await publishReaderChanges(observed, databaseUrl, [
		{ key: "page:missing-b", revision: 3 },
	]);
	expect({
		list: list.mock.calls.length,
		head: head.mock.calls.length,
	}).toEqual(counts);
	expect((await serve()).headers.get("X-Evame-HTML-Cache")).toBe("HIT");
});

it.each(["GET", "HEAD"])(
	"旧HTMLの%sアセットをR2から元のContent-Typeで返す",
	async (method) => {
		await bucket.put("assets/_astro/old.js", "export {};", {
			httpMetadata: {
				contentType: "text/javascript",
				cacheControl: "public, max-age=31536000, immutable",
			},
		});
		const assets = {
			fetch: vi.fn(async () => new Response("missing", { status: 404 })),
		};
		const response = await fetchReaderAsset(
			new Request("https://evame.test/_astro/old.js", { method }),
			assets,
			bucket,
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe(method === "HEAD" ? "" : "export {};");
		expect(response.headers.get("Content-Type")).toBe("text/javascript");
		expect(response.headers.get("Cache-Control")).toContain("immutable");
		expect(response.headers.get("Content-Length")).toBe("10");
		expect(response.headers.get("ETag")).toBeTruthy();
	},
);
it("現行アセットの配信ではR2を読まない", async () => {
	const stored = { get: vi.fn(), head: vi.fn() };
	const assets = { fetch: vi.fn(async () => new Response("current")) };
	expect(
		await (
			await fetchReaderAsset(
				new Request("https://evame.test/_astro/new.js"),
				assets,
				stored,
			)
		).text(),
	).toBe("current");
	expect(stored.get).not.toHaveBeenCalled();
	expect(stored.head).not.toHaveBeenCalled();
});
it("R2にも存在しない旧アセットは404を返す", async () => {
	expect(
		(
			await fetchReaderAsset(
				new Request("https://evame.test/_astro/missing.js"),
				{ fetch: async () => new Response("missing", { status: 404 }) },
				bucket,
			)
		).status,
	).toBe(404);
});
it("旧アセットのETagが一致すれば本文を送らない", async () => {
	const object = await bucket.put("assets/_astro/old.js", "export {};");
	const response = await fetchReaderAsset(
		new Request("https://evame.test/_astro/old.js", {
			headers: { "If-None-Match": object!.httpEtag },
		}),
		{ fetch: async () => new Response("missing", { status: 404 }) },
		bucket,
	);
	expect(response.status).toBe(304);
	expect(await response.text()).toBe("");
});
it("POSTではR2の旧アセットを返さない", async () => {
	await bucket.put("assets/_astro/old.js", "export {};");
	expect(
		(
			await fetchReaderAsset(
				new Request("https://evame.test/_astro/old.js", { method: "POST" }),
				{ fetch: async () => new Response("missing", { status: 404 }) },
				bucket,
			)
		).status,
	).toBe(404);
});
