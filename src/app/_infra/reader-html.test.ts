import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { R2Bucket } from "@cloudflare/workers-types";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { readerCacheTags } from "../_domain/reader-cache-tags";
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
const serve = (input = request, build = "build-1") =>
	fetchReaderHtml(input, bucket, build, databaseUrl, render);

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
	const instrumented = { get, list, put: bucket.put.bind(bucket) };
	const response = await fetchReaderHtml(
		request,
		instrumented,
		"build-1",
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
	const registered = await bucket.list({ prefix: "html/" });
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
it("別のWorker版で非公開化した後に旧Workerへ戻しても本文を再配信しない", async () => {
	await serve(request, "build-1");
	await serve(request, "build-2");
	await publishReaderChanges(bucket, databaseUrl, [
		{ key: "page:1", revision: 2 },
	]);
	render.mockResolvedValueOnce({
		revision: 2,
		response: new Response("Not Found", { status: 404 }),
	});
	expect((await serve(request, "build-1")).status).toBe(404);
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
it("ビルドの版とURLのクエリが異なるHTMLを共有しない", async () => {
	await serve();
	await serve(new Request(`${request.url}?view=source`));
	await serve(request, "build-2");
	expect(render).toHaveBeenCalledTimes(3);
});
it("1時間より古いHTMLは更新記録の保持期限に依存せず再生成する", async () => {
	const now = Date.now();
	const clock = vi.spyOn(Date, "now").mockReturnValue(now);
	try {
		await serve();
		clock.mockReturnValue(now + 3600001);
		await serve();
		expect(render).toHaveBeenCalledTimes(2);
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
it("同じWorker版とURLでもDBが異なる場合はHTMLを共有しない", async () => {
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
		"build-1",
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
	await expect(
		fetchReaderHtml(request, bucket, "build-1", "", render),
	).rejects.toThrow("TURSO_DATABASE_URL is not defined");
	await expect(
		publishReaderChanges(bucket, "", [{ key: "page:1", revision: 2 }]),
	).rejects.toThrow("TURSO_DATABASE_URL is not defined");
	expect(render).not.toHaveBeenCalled();
	expect((await bucket.list()).objects).toHaveLength(0);
});
it("保存側はLISTの続きも取得して後半の公開HTMLを無効化する", async () => {
	await serve();
	const list = vi
		.fn()
		.mockResolvedValueOnce({ objects: [], truncated: true, cursor: "more" })
		.mockResolvedValueOnce(
			await bucket.list({ prefix: "html/", include: ["customMetadata"] }),
		);
	await publishReaderChanges(
		{
			head: bucket.head.bind(bucket),
			list,
			put: bucket.put.bind(bucket),
		},
		databaseUrl,
		[{ key: "page:1", revision: 2 }],
	);
	expect(list.mock.calls[1][0].cursor).toBe("more");
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
it("生成に時間がかかっても生成開始から1時間で保存HTMLを失効させる", async () => {
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
		await serve();
		expect(render).toHaveBeenCalledTimes(2);
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
			{ head: bucket.head.bind(bucket), list: bucket.list.bind(bucket), put },
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
		{ head: bucket.head.bind(bucket), list, put: bucket.put.bind(bucket) },
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
	const list = async (...args: Parameters<typeof bucket.list>) => {
		const snapshot = await bucket.list(...args);
		const object = snapshot.objects[0];
		const stored = await bucket.get(object.key);
		const html = await stored!.json<Record<string, unknown>>();
		await bucket.put(
			object.key,
			JSON.stringify({
				...html,
				generation: crypto.randomUUID(),
				revision: 3,
				body: "最新の本文",
			}),
			{
				customMetadata: { state: "ready", revision: "3", tags: tags.join(",") },
			},
		);
		return snapshot;
	};
	await publishReaderChanges(
		{ head: bucket.head.bind(bucket), list, put: bucket.put.bind(bucket) },
		databaseUrl,
		[{ key: "page:1", revision: 2 }],
	);
	expect(await (await serve()).text()).toBe("最新の本文");
	expect(render).toHaveBeenCalledTimes(1);
});

it("依存タグがR2のmetadata上限を超えても変更した本文を再生成する", async () => {
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

it("HTMLの登録に失敗したときは無効化できない生成を開始しない", async () => {
	const broken = {
		get: bucket.get.bind(bucket),
		put: vi.fn().mockRejectedValue(new Error("R2 registration unavailable")),
	};
	await expect(
		fetchReaderHtml(request, broken, "build-1", databaseUrl, render),
	).rejects.toThrow("R2 registration unavailable");
	expect(render).not.toHaveBeenCalled();
});
