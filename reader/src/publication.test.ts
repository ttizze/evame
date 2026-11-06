// @vitest-environment node
import { createHash } from "node:crypto";
import type { R2Bucket } from "@cloudflare/workers-types";
import { expect, it, vi } from "vitest";
import { readerDocumentKey } from "../../src/app/_domain/reader-document";
import { publishReaderDocuments } from "./publication";

function storage() {
	const objects = new Map<
		string,
		{ etag: string; bytes: Uint8Array; customMetadata: Record<string, string> }
	>();
	const bucket = {
		get: vi.fn(async (key: string) => {
			const object = objects.get(key);
			return object
				? {
						...object,
						json: async () =>
							JSON.parse(new TextDecoder().decode(object.bytes)),
					}
				: null;
		}),
		head: vi.fn(async (key: string) => objects.get(key) ?? null),
		put: vi.fn(
			async (
				key: string,
				value: string | ArrayBuffer,
				options: {
					onlyIf: { etagMatches: string } | Headers;
					customMetadata?: Record<string, string>;
				},
			) => {
				const previous = objects.get(key);
				if (
					!(options.onlyIf instanceof Headers) &&
					options.onlyIf.etagMatches !== previous?.etag
				)
					return null;
				if (
					options.onlyIf instanceof Headers &&
					options.onlyIf.get("If-None-Match") === "*" &&
					previous
				)
					return null;
				const bytes =
					typeof value === "string"
						? new TextEncoder().encode(value)
						: new Uint8Array(value);
				const object = {
					etag: createHash("sha256").update(bytes).digest("hex"),
					bytes,
					customMetadata: options.customMetadata ?? {},
				};
				objects.set(key, object);
				return object;
			},
		),
	};
	return { bucket: bucket as unknown as R2Bucket, objects };
}

it("初回の公開更新でも全URLの生成が終わるまで残り件数を返す", async () => {
	const { bucket } = storage();
	const catalog = {
		revision: 1,
		documents: Object.fromEntries(
			Array.from({ length: 105 }, (_, index) => [
				`/ja/author/article-${index}`,
				"initial",
			]),
		),
	};
	const render = vi.fn(
		async () => new Response("本文", { headers: { "X-Evame-Public": "true" } }),
	);
	expect(
		await publishReaderDocuments(
			bucket,
			"build",
			catalog,
			render,
			"content",
			"ja",
		),
	).toEqual({ remaining: 9, generated: 96 });
	expect(
		await publishReaderDocuments(
			bucket,
			"build",
			catalog,
			render,
			"content",
			"ja",
		),
	).toEqual({ remaining: 0, generated: 9 });
	expect(render).toHaveBeenCalledTimes(105);
});

it("公開・更新処理でHTMLを保存し、再実行時は変更のない本文を生成しない", async () => {
	const { bucket, objects } = storage();
	const render = vi.fn(
		async () =>
			new Response("記事本文", { headers: { "X-Evame-Public": "true" } }),
	);
	const catalog = {
		revision: 1,
		documents: { "/ja/author/article": "initial" },
	};
	expect(
		await publishReaderDocuments(
			bucket,
			"build",
			catalog,
			render,
			"content",
			"ja",
		),
	).toEqual({ remaining: 0, generated: 1 });
	expect(
		new TextDecoder().decode(
			objects.get(readerDocumentKey("/ja/author/article"))?.bytes,
		),
	).toContain("記事本文");
	await publishReaderDocuments(
		bucket,
		"build",
		catalog,
		render,
		"content",
		"ja",
	);
	expect(render).toHaveBeenCalledOnce();
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: { "/ja/author/article": "edited" } },
		render,
		"content",
		"ja",
	);
	expect(render).toHaveBeenCalledTimes(2);
});

it("非公開化で旧HTMLを404へ置き換え、元に戻さない", async () => {
	const { bucket, objects } = storage();
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 1, documents: { "/ja/author/article": "public" } },
		async () =>
			new Response("公開本文", { headers: { "X-Evame-Public": "true" } }),
		"content",
		"ja",
	);
	const oldRender = Promise.withResolvers<Response>();
	const render = vi.fn(() => oldRender.promise);
	const old = publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: { "/ja/author/article": "edited" } },
		render,
		"content",
		"ja",
	);
	await vi.waitFor(() => expect(render).toHaveBeenCalled());
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 3, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
	);
	oldRender.resolve(
		new Response("非公開化前の本文", { headers: { "X-Evame-Public": "true" } }),
	);
	await expect(old).rejects.toThrow("superseded");
	expect(
		objects.get(readerDocumentKey("/ja/author/article"))?.customMetadata.status,
	).toBe("404");
	expect(
		new TextDecoder().decode(
			objects.get(readerDocumentKey("/ja/author/article"))?.bytes,
		),
	).toContain("見つかりません");
});

it("初回のHTML生成中に非公開化しても、生成完了が遅れた旧本文を公開しない", async () => {
	const { bucket, objects } = storage();
	const oldRender = Promise.withResolvers<Response>();
	const render = vi.fn(() => oldRender.promise);
	const old = publishReaderDocuments(
		bucket,
		"build",
		{ revision: 1, documents: { "/ja/author/article": "initial" } },
		render,
		"content",
		"ja",
	);
	await vi.waitFor(() => expect(render).toHaveBeenCalled());
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
	);
	oldRender.resolve(
		new Response("旧本文", { headers: { "X-Evame-Public": "true" } }),
	);
	await expect(old).rejects.toThrow("superseded");
	expect(
		objects.get(readerDocumentKey("/ja/author/article"))?.customMetadata.status,
	).not.toBe("200");
});

it.each([
	new Response("下書き", { headers: { "Cache-Control": "private, no-store" } }),
	new Response("セッション入り本文", {
		headers: { "X-Evame-Public": "true", "Set-Cookie": "dummy-session=value" },
	}),
	new Response("生成失敗", { status: 500 }),
])(
	"下書き・個人のCookie・生成エラーを共有HTMLへ保存しない",
	async (response) => {
		const { bucket, objects } = storage();
		await expect(
			publishReaderDocuments(
				bucket,
				"build",
				{ revision: 1, documents: { "/ja/article": "test" } },
				async () => response,
				"content",
				"ja",
			),
		).rejects.toThrow();
		expect(objects.has(readerDocumentKey("/ja/article"))).toBe(false);
	},
);

it("デプロイで画面のコードが変わったら生成済みの本文も更新する", async () => {
	const { bucket } = storage();
	const render = vi.fn(
		async () => new Response("本文", { headers: { "X-Evame-Public": "true" } }),
	);
	const catalog = { revision: 1, documents: { "/ja": "same" } };
	await publishReaderDocuments(
		bucket,
		"old-build",
		catalog,
		render,
		"deployment",
		"ja",
	);
	await publishReaderDocuments(
		bucket,
		"new-build",
		catalog,
		render,
		"deployment",
		"ja",
	);
	expect(render).toHaveBeenCalledTimes(2);
});

it("コメントが減った後も以前の途中ページで本文を読め、後日の非公開化でそのHTMLも削除する", async () => {
	const { bucket, objects } = storage();
	const render = vi.fn(
		async () =>
			new Response("記事本文", { headers: { "X-Evame-Public": "true" } }),
	);
	await publishReaderDocuments(
		bucket,
		"build",
		{
			revision: 1,
			documents: {
				"/ja/author/article": "initial",
				"/ja/author/article?page=2": "initial",
			},
		},
		render,
		"content",
		"ja",
	);
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: { "/ja/author/article": "edited" } },
		render,
		"content",
		"ja",
	);
	expect(
		objects.get(readerDocumentKey("/ja/author/article?page=2"))?.customMetadata
			.status,
	).toBe("200");
	expect(render).toHaveBeenLastCalledWith("/ja/author/article?page=2");
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 3, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
	);
	expect(
		objects.get(readerDocumentKey("/ja/author/article?page=2"))?.customMetadata
			.status,
	).toBe("404");
});

it("デプロイの一括生成中も、通常の保存は変更した記事だけを生成する", async () => {
	const { bucket } = storage();
	const documents = Object.fromEntries(
		Array.from({ length: 105 }, (_, index) => [
			`/ja/author/article-${index}`,
			"initial",
		]),
	);
	const render = vi.fn(
		async () => new Response("本文", { headers: { "X-Evame-Public": "true" } }),
	);
	expect(
		(
			await publishReaderDocuments(
				bucket,
				"build",
				{ revision: 1, documents },
				render,
				"deployment",
				"ja",
			)
		).remaining,
	).toBe(9);
	const before = render.mock.calls.length;
	documents["/ja/author/article-0"] = "edited";
	expect(
		await publishReaderDocuments(
			bucket,
			"build",
			{ revision: 2, documents },
			render,
			"content",
			"ja",
		),
	).toEqual({ remaining: 0, generated: 1 });
	expect(render.mock.calls.length - before).toBe(1);
	expect(
		(
			await publishReaderDocuments(
				bucket,
				"build",
				{ revision: 2, documents },
				render,
				"deployment",
				"ja",
			)
		).remaining,
	).toBe(0);
});

it("同じ404本文を書き戻す古い生成処理でも、非公開化後の版を巻き戻さない", async () => {
	const { bucket, objects } = storage();
	const path = "/ja/author/article";
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 1, documents: { [path]: "initial" } },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
	);
	const entered = Promise.withResolvers<void>();
	const resume = Promise.withResolvers<void>();
	const write = vi.mocked(bucket.put).getMockImplementation();
	if (!write) throw new Error("R2の書き込みがない");
	vi.mocked(bucket.put).mockImplementation(async (key, body, options) => {
		if (
			key === readerDocumentKey(path) &&
			options?.customMetadata?.revision === "2"
		) {
			entered.resolve();
			await resume.promise;
		}
		return write(key, body, options);
	});
	const old = publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: { [path]: "edited" } },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
	);
	await entered.promise;
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 3, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
	);
	resume.resolve();
	await expect(old).rejects.toThrow("superseded");
	expect(objects.get(readerDocumentKey(path))?.customMetadata.revision).toBe(
		"3",
	);
});
