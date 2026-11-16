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
	await serve();
	expect((await bucket.list({ prefix: "html/" })).objects).toHaveLength(0);
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
	expect((await bucket.list({ prefix: "html/" })).objects).toHaveLength(0);
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
	expect((await bucket.list({ prefix: "html/" })).objects).toHaveLength(0);
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
it("変更記録を読み取れないときは古いHTMLのHITを返さない", async () => {
	await serve();
	const broken = {
		get: bucket.get.bind(bucket),
		list: vi.fn().mockRejectedValue(new Error("R2 unavailable")),
		put: bucket.put.bind(bucket),
	};
	await expect(
		fetchReaderHtml(request, broken, "build-1", databaseUrl, render),
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
it("変更記録が一度の取得件数を超えたら見落としを避けて再生成する", async () => {
	await serve();
	const overflowing = {
		get: bucket.get.bind(bucket),
		list: vi
			.fn()
			.mockResolvedValue({ objects: [], truncated: true, cursor: "more" }),
		put: bucket.put.bind(bucket),
	};
	const response = await fetchReaderHtml(
		request,
		overflowing,
		"build-1",
		databaseUrl,
		render,
	);
	expect(response.headers.get("X-Evame-HTML-Cache")).toBe("MISS");
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
	expect((await bucket.list({ prefix: "html/" })).objects).toHaveLength(0);
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
