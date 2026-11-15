import type { R2Bucket } from "@cloudflare/workers-types";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
const tag = `reader:${"a".repeat(64)}`;
const request = new Request(
	"https://evame.test/ja/author/article?view=source&page=2",
);
const render = vi.fn(
	async () =>
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

it("DB変更のない人気順も1時間を超えたHTMLを再利用しない", async () => {
	const clock = vi.spyOn(Date, "now").mockReturnValue(3600000);
	await servePublishedHtml(request, bucket, "test", render);
	clock.mockReturnValue(7200000);
	await servePublishedHtml(request, bucket, "test", render);
	expect(render).toHaveBeenCalledTimes(2);
});

it("公開本文を保存し再訪はDBとAstroを呼ばずURLの表示形式とコメントページを保つ", async () => {
	expect(
		await (await servePublishedHtml(request, bucket, "test", render)).text(),
	).toContain("本文");
	const cached = await servePublishedHtml(request, bucket, "test", render);
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
			)
		).status,
	).toBe(200);
	expect(render).toHaveBeenCalledTimes(2);
});
it("無効化後の最初の閲覧で非公開記事の旧本文を返さず404を保存しない", async () => {
	await servePublishedHtml(request, bucket, "test", render);
	await invalidatePublishedHtml(bucket, "test", [tag], 2);
	const hidden = vi.fn(async () => new Response(null, { status: 404 }));
	expect(
		(await servePublishedHtml(request, bucket, "test", hidden)).status,
	).toBe(404);
	expect(
		(await servePublishedHtml(request, bucket, "test", hidden)).status,
	).toBe(404);
	expect(hidden).toHaveBeenCalledTimes(2);
});
it("生成中に新しい無効化が完了した場合は古いHTMLを保存成功にしない", async () => {
	await expect(
		servePublishedHtml(request, bucket, "test", async () => {
			await invalidatePublishedHtml(bucket, "test", [tag], 2);
			return render();
		}),
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
				await invalidatePublishedHtml(bucket, "test", [tag], 2);
				return render();
			}
			return new Response("最新の本文", {
				headers: { "X-Publication-Tags": tag, "X-Publication-Revision": "2" },
			});
		},
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
		await servePublishedHtml(request, bucket, "test", async () => response);
		expect(records.size).toBe(0);
	}
	const search = new Request("https://evame.test/ja/search?query=test");
	await servePublishedHtml(search, bucket, "test", render);
	expect(records.size).toBe(0);
});
