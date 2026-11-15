import type { R2Bucket } from "@cloudflare/workers-types";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { schedulePublication } from "../../../shared/infra/reader-publication";
import { invalidatePublishedHtml, servePublishedHtml } from "./published-html";

const records = new Map<
	string,
	{ body: string; customMetadata: { revision: string; digest: string } }
>();
vi.mock("../../../shared/infra/reader-publication", () => ({
	schedulePublication: vi.fn(
		async (
			_bucket: unknown,
			key: string,
			revision: number,
			digest: string,
			body: string,
		) => {
			const previous = records.get(key);
			if (previous && Number(previous.customMetadata.revision) > revision)
				return 409;
			records.set(key, {
				body,
				customMetadata: { revision: String(revision), digest },
			});
			return 204;
		},
	),
}));
const bucket = {
	head: vi.fn(async (key: string) => records.get(key) ?? null),
	get: vi.fn(async (key: string) => {
		const value = records.get(key);
		return value ? { json: async () => JSON.parse(value.body) } : null;
	}),
} as unknown as R2Bucket;
const context = { waitUntil: vi.fn() };
const tag = `reader:${"a".repeat(64)}`;
const request = new Request(
	"https://evame.test/ja/author/article?view=source&page=2",
);
const render = vi.fn(
	async (_input: Request) =>
		new Response("<main>本文</main>", {
			headers: {
				"Content-Type": "text/html",
				"X-Publication-Tags": tag,
				"X-Publication-Revision": "1",
			},
		}),
);
beforeEach(() => {
	records.clear();
	render.mockClear();
});
afterEach(() => vi.restoreAllMocks());

it("長い日本語URLもR2キーの上限内で保存し異なる記事を混同しない", async () => {
	for (const suffix of ["前編", "後編"]) {
		const longRequest = new Request(
			`https://evame.test/ja/author/${encodeURIComponent("長い日本語の題名".repeat(60) + suffix)}`,
		);
		await servePublishedHtml(longRequest, bucket, "test", render, context);
		await servePublishedHtml(longRequest, bucket, "test", render, context);
	}
	expect(render).toHaveBeenCalledTimes(2);
	expect(records.size).toBe(2);
	for (const key of records.keys()) {
		expect(new TextEncoder().encode(key).byteLength).toBeLessThanOrEqual(1024);
		expect(key.split("/").at(-1)).toMatch(/^[a-f0-9]{64}$/);
	}
});
it("DB変更のない人気順も1時間を超えたHTMLを再利用しない", async () => {
	const clock = vi.spyOn(Date, "now").mockReturnValue(3600000);
	await servePublishedHtml(request, bucket, "test", render, context);
	clock.mockReturnValue(7200000);
	await servePublishedHtml(request, bucket, "test", render, context);
	expect(render).toHaveBeenCalledTimes(2);
});

it("公開本文を保存し再訪はDBとAstroを呼ばずURLの表示形式とコメントページを保つ", async () => {
	expect(
		await (
			await servePublishedHtml(request, bucket, "test", render, context)
		).text(),
	).toContain("本文");
	const cached = await servePublishedHtml(
		request,
		bucket,
		"test",
		render,
		context,
	);
	expect(cached.headers.get("X-Evame-HTML")).toBe("publication");
	expect(await cached.text()).toContain("本文");
	expect(render).toHaveBeenCalledTimes(1);
	expect(
		(
			await servePublishedHtml(
				new Request("https://evame.test/ja/author/article"),
				bucket,
				"test",
				render,
				context,
			)
		).status,
	).toBe(200);
	expect(render).toHaveBeenCalledTimes(2);
});
it("無効化後の最初の閲覧で非公開記事の旧本文を返さず404を保存しない", async () => {
	await servePublishedHtml(request, bucket, "test", render, context);
	await invalidatePublishedHtml(bucket, "test", [tag], 2, context);
	const hidden = vi.fn(async () => new Response(null, { status: 404 }));
	expect(
		(await servePublishedHtml(request, bucket, "test", hidden, context)).status,
	).toBe(404);
	expect(
		(await servePublishedHtml(request, bucket, "test", hidden, context)).status,
	).toBe(404);
	expect(hidden).toHaveBeenCalledTimes(2);
});
it("生成中に新しい無効化が完了した場合は古いHTMLを保存成功にしない", async () => {
	await expect(
		servePublishedHtml(
			request,
			bucket,
			"test",
			async () => {
				await invalidatePublishedHtml(bucket, "test", [tag], 2, context);
				return render(request);
			},
			context,
		),
	).rejects.toThrow();
});

it("生成中の更新後は1秒待って最新の本文から描画し直す", async () => {
	let calls = 0;
	const response = await servePublishedHtml(
		request,
		bucket,
		"test",
		async () => {
			calls++;
			if (calls === 1) {
				await invalidatePublishedHtml(bucket, "test", [tag], 2, context);
				return render(request);
			}
			return new Response("最新の本文", {
				headers: { "X-Publication-Tags": tag, "X-Publication-Revision": "2" },
			});
		},
		context,
	);
	expect(await response.text()).toBe("最新の本文");
	expect(calls).toBe(2);
});
it("下書きプレビューと検索とCookieを含む応答を共有HTMLへ保存しない", async () => {
	for (const response of [
		new Response("private"),
		new Response("private", {
			headers: {
				"X-Publication-Tags": tag,
				"X-Publication-Revision": "1",
				"Set-Cookie": "session=private",
			},
		}),
	]) {
		await servePublishedHtml(
			request,
			bucket,
			"test",
			async () => response,
			context,
		);
		expect(records.size).toBe(0);
	}
	const search = new Request("https://evame.test/ja/search?query=test");
	await servePublishedHtml(search, bucket, "test", render, context);
	expect(records.size).toBe(0);
});

it("無関係なクエリと既定値を保存キーとAstroへのURLから除き同じHTMLを再利用する", async () => {
	const renderUrl = vi.fn(
		async (input: Request) =>
			new Response(input.url, {
				headers: { "X-Publication-Tags": tag, "X-Publication-Revision": "1" },
			}),
	);
	for (const search of [
		"?utm_source=a&view=both&page=1",
		"?x=random&view=invalid&page=0",
		"",
	]) {
		const response = await servePublishedHtml(
			new Request(`https://evame.test/ja/author/article${search}`),
			bucket,
			"test",
			renderUrl,
			context,
		);
		expect(await response.text()).toBe("https://evame.test/ja/author/article");
	}
	expect(renderUrl).toHaveBeenCalledOnce();
	expect(records.size).toBe(1);
});

it.each([
	[
		"/ja/author/article?x=a&view=source&page=2",
		"/ja/author/article?page=2&view=source",
	],
	[
		"/ja/author?view=user&sort=new&page=3&x=a",
		"/ja/author?page=3&sort=new&view=user",
	],
	["/ja/tag/test?page=2&sort=new", "/ja/tag/test?page=2"],
	["/ja/new-pages?page=2&sort=new", "/ja/new-pages?page=2"],
	["/ja?sort=new&page=2&view=source", "/ja?view=source"],
])("URL %s の描画に必要なクエリを保存する", async (path, expected) => {
	await servePublishedHtml(
		new Request(`https://evame.test${path}`),
		bucket,
		"test",
		render,
		context,
	);
	expect(render.mock.calls.at(-1)?.[0].url).toBe(
		`https://evame.test${expected}`,
	);
});

it("同じ版の競合が続いた場合も1秒待った2回で再試行を終了する", async () => {
	const publication = vi.mocked(schedulePublication).mockResolvedValue(503);
	try {
		const result = expect(
			servePublishedHtml(request, bucket, "test", render, context),
		).rejects.toThrow("HTTP 409");
		// 修正前の再帰も3回目で停止させ、無制限なテスト実行を防ぐ。
		publication
			.mockResolvedValueOnce(409)
			.mockResolvedValueOnce(409)
			.mockResolvedValueOnce(503);
		await result;
		expect(render).toHaveBeenCalledTimes(2);
	} finally {
		publication
			.mockReset()
			.mockImplementation(async (_bucket, key, revision, digest, body) => {
				records.set(key, {
					body,
					customMetadata: { revision: String(revision), digest },
				});
				return 204;
			});
	}
});

it("全体無効化前に始まった生成が後から完了しても新しい世代のHTMLを上書きしない", async () => {
	let generation = "before-deploy";
	vi.spyOn(bucket, "head").mockImplementation(
		async (key: string) =>
			(key === "test/generation"
				? { etag: generation }
				: (records.get(key) ?? null)) as Awaited<ReturnType<R2Bucket["head"]>>,
	);
	const started = Promise.withResolvers<void>();
	const resume = Promise.withResolvers<void>();
	const older = servePublishedHtml(
		request,
		bucket,
		"test",
		async () => {
			started.resolve();
			await resume.promise;
			return new Response("更新前の描画", {
				headers: { "X-Publication-Tags": tag, "X-Publication-Revision": "1" },
			});
		},
		context,
	);
	await started.promise;
	generation = "after-deploy";
	const latest = vi.fn(
		async () =>
			new Response("更新後の描画", {
				headers: { "X-Publication-Tags": tag, "X-Publication-Revision": "1" },
			}),
	);
	expect(
		await (
			await servePublishedHtml(request, bucket, "test", latest, context)
		).text(),
	).toBe("更新後の描画");
	resume.resolve();
	await older;
	expect(
		await (
			await servePublishedHtml(request, bucket, "test", latest, context)
		).text(),
	).toBe("更新後の描画");
	expect(latest).toHaveBeenCalledTimes(1);
});
