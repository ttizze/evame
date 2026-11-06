// @vitest-environment node
import { createHash } from "node:crypto";
import type { R2Bucket } from "@cloudflare/workers-types";
import { expect, it, vi } from "vitest";
import { readerDocumentKey } from "../../src/app/_domain/reader-document";
import { publishReaderDocuments } from "./publication";
import { updateReaderSources } from "./source-revisions";

it("生成が失敗した記事Aの更新時期を全言語で共有し、後の保存Bには持ち込まない", async () => {
	const { bucket } = storage();
	const first = await updateReaderSources(bucket, {
		revision: 1,
		sources: { "/author/a": "a-1", "/author/b": "b-1" },
	});
	expect(first).toEqual({ "/author/a": 1, "/author/b": 1 });
	await updateReaderSources(bucket, {
		revision: 2,
		sources: { "/author/a": "a-2", "/author/b": "b-1" },
	});
	const latest = await updateReaderSources(bucket, {
		revision: 3,
		sources: { "/author/a": "a-2", "/author/b": "b-2" },
	});
	expect(latest).toEqual({ "/author/a": 2, "/author/b": 3 });
	const initial = { "/en/author/a": "a-1", "/en/author/b": "b-1" };
	await publishReaderDocuments(
		bucket,
		"version",
		{ revision: 1, documents: initial },
		async () =>
			new Response("元本文", { headers: { "X-Evame-Public": "true" } }),
		"deployment",
		"en",
		"deploy",
		null,
	);
	const render = vi.fn(async (path: string) =>
		path.endsWith("/a")
			? new Response("Aだけ失敗", { status: 500 })
			: new Response("Bの更新", { headers: { "X-Evame-Public": "true" } }),
	);
	expect(
		await publishReaderDocuments(
			bucket,
			"version",
			{
				revision: 3,
				documents: { "/en/author/a": "a-2", "/en/author/b": "b-2" },
			},
			render,
			"content",
			"en",
			"save-b",
			new Set(["/author/b"]),
		),
	).toEqual({ generated: 1, remaining: 0 });
	expect(render).toHaveBeenCalledOnce();
	expect(render).toHaveBeenCalledWith("/en/author/b");
});

it("生成元を以前の内容へ戻した場合も、元の版を使い回さず今回の変更として記録する", async () => {
	const { bucket } = storage();
	for (const [revision, hash] of [
		[1, "initial"],
		[2, "edited"],
		[3, "initial"],
	] as const) {
		expect(
			await updateReaderSources(bucket, {
				revision,
				sources: { "/author/a": hash },
			}),
		).toEqual({ "/author/a": revision });
	}
	await expect(
		updateReaderSources(bucket, { revision: 2, sources: {} }),
	).rejects.toThrow("superseded");
});

it("一覧から消えたタグの変更時期を保持し、後の無関係な保存で再び変更扱いにしない", async () => {
	const { bucket } = storage();
	await updateReaderSources(bucket, {
		revision: 1,
		sources: { "/tag/old": "initial" },
	});
	expect(
		await updateReaderSources(bucket, { revision: 2, sources: {} }),
	).toEqual({ "/tag/old": 2 });
	expect(
		await updateReaderSources(bucket, { revision: 3, sources: {} }),
	).toEqual({ "/tag/old": 2 });
	expect(
		await updateReaderSources(bucket, {
			revision: 4,
			sources: { "/tag/old": "initial" },
		}),
	).toEqual({ "/tag/old": 4 });
});

it("一括生成が今回の変更を先に登録していても、保存成功の前にその本文を生成する", async () => {
	const { bucket, objects } = storage();
	const pending = Promise.withResolvers<Response>();
	const render = vi.fn(() => pending.promise);
	const catalog = {
		revision: 2,
		documents: { "/ja/author/article": "edited" },
	};
	const deployment = publishReaderDocuments(
		bucket,
		"version",
		catalog,
		render,
		"deployment",
		"ja",
		"deploy",
		null,
	);
	await vi.waitFor(() => expect(render).toHaveBeenCalled());
	expect(
		await publishReaderDocuments(
			bucket,
			"version",
			catalog,
			async () =>
				new Response("保存済み本文", { headers: { "X-Evame-Public": "true" } }),
			"content",
			"ja",
			"save",
			new Set(["/author/article"]),
		),
	).toEqual({ generated: 1, remaining: 0 });
	pending.resolve(
		new Response("以前の生成", { headers: { "X-Evame-Public": "true" } }),
	);
	await expect(deployment).rejects.toThrow("superseded");
	expect(
		new TextDecoder().decode(
			objects.get(readerDocumentKey("/ja/author/article"))?.bytes,
		),
	).toContain("保存済み本文");
});

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

it("同じDBの版でも、旧デプロイの遅い生成結果が新デプロイのHTMLを上書きしない", async () => {
	const { bucket, objects } = storage();
	const catalog = {
		revision: 1,
		documents: { "/ja/author/article": "initial" },
	};
	const previous = Promise.withResolvers<Response>();
	const render = vi.fn(() => previous.promise);
	const old = publishReaderDocuments(
		bucket,
		"old-version",
		catalog,
		render,
		"deployment",
		"ja",
		"old-deploy",
		null,
	);
	await vi.waitFor(() => expect(render).toHaveBeenCalled());
	await publishReaderDocuments(
		bucket,
		"new-version",
		catalog,
		async () =>
			new Response("新版のHTML", { headers: { "X-Evame-Public": "true" } }),
		"deployment",
		"ja",
		"new-deploy",
		null,
	);
	previous.resolve(
		new Response("旧版のHTML", { headers: { "X-Evame-Public": "true" } }),
	);
	await expect(old).rejects.toThrow("superseded");
	expect(
		new TextDecoder().decode(
			objects.get(readerDocumentKey("/ja/author/article"))?.bytes,
		),
	).toContain("新版のHTML");
});

it("記事Aの生成が失敗しても、無関係な記事Bの公開更新は完了できる", async () => {
	const { bucket } = storage();
	const initial = { "/ja/author/a": "initial-a", "/ja/author/b": "initial-b" };
	await publishReaderDocuments(
		bucket,
		"version",
		{ revision: 1, documents: initial },
		async () =>
			new Response("初期本文", { headers: { "X-Evame-Public": "true" } }),
		"deployment",
		"ja",
		"deploy",
		null,
	);
	const documents = { ...initial, "/ja/author/a": "edited-a" };
	await expect(
		publishReaderDocuments(
			bucket,
			"version",
			{ revision: 2, documents },
			async () => new Response("失敗", { status: 500 }),
			"content",
			"ja",
			"save-a",
			null,
		),
	).rejects.toThrow("HTTP 500");
	documents["/ja/author/b"] = "edited-b";
	const render = vi.fn(async (path: string) =>
		path.endsWith("/a")
			? new Response("失敗", { status: 500 })
			: new Response("更新本文", { headers: { "X-Evame-Public": "true" } }),
	);
	expect(
		await publishReaderDocuments(
			bucket,
			"version",
			{ revision: 3, documents },
			render,
			"content",
			"ja",
			"save-b",
			new Set(["/author/b"]),
		),
	).toEqual({ generated: 1, remaining: 0 });
	expect(render).toHaveBeenCalledWith("/ja/author/b");
	expect(render).toHaveBeenCalledOnce();
	await expect(
		publishReaderDocuments(
			bucket,
			"version",
			{ revision: 3, documents },
			render,
			"content",
			"ja",
			"save-a",
			null,
		),
	).rejects.toThrow("HTTP 500");
});

it.each([0, 1, 2])(
	"R2の登録・本文保存・確定で書き込み制限が起きたら、同じ条件で再試行する（%i）",
	async (limitedWrite) => {
		const { bucket } = storage();
		const write = vi.mocked(bucket.put).getMockImplementation();
		if (!write) throw new Error("R2の書き込みがない");
		let calls = 0;
		vi.mocked(bucket.put).mockImplementation(async (...args) => {
			if (calls++ === limitedWrite)
				throw Object.assign(new Error("TooManyRequests"), { code: 10058 });
			return write(...args);
		});
		vi.useFakeTimers();
		try {
			const render = vi.fn(
				async () =>
					new Response("本文", { headers: { "X-Evame-Public": "true" } }),
			);
			const finished = expect(
				publishReaderDocuments(
					bucket,
					"version",
					{ revision: 1, documents: { "/ja/author/article": "initial" } },
					render,
					"content",
					"ja",
					"job",
					null,
				),
			).resolves.toEqual({ remaining: 0, generated: 1 });
			await vi.runAllTimersAsync();
			await finished;
			expect(render).toHaveBeenCalledOnce();
			expect(bucket.put).toHaveBeenCalledTimes(4);
		} finally {
			vi.useRealTimers();
		}
	},
);

it("R2の書き込み制限が続く場合は再試行を打ち切り、保存完了にしない", async () => {
	const { bucket } = storage();
	vi.mocked(bucket.put).mockRejectedValue(
		Object.assign(new Error("TooManyRequests"), { code: 10058 }),
	);
	vi.useFakeTimers();
	try {
		const finished = expect(
			publishReaderDocuments(
				bucket,
				"version",
				{ revision: 1, documents: {} },
				vi.fn(),
				"content",
				"ja",
				"job",
				null,
			),
		).rejects.toThrow("TooManyRequests");
		await vi.runAllTimersAsync();
		await finished;
		expect(bucket.put).toHaveBeenCalledTimes(5);
	} finally {
		vi.useRealTimers();
	}
});

it("R2の書き込み制限以外のエラーは再試行しない", async () => {
	const { bucket } = storage();
	vi.mocked(bucket.put).mockRejectedValue(
		Object.assign(new Error("AccessDenied"), { code: 10003 }),
	);
	await expect(
		publishReaderDocuments(
			bucket,
			"version",
			{ revision: 1, documents: {} },
			vi.fn(),
			"content",
			"ja",
			"job",
			null,
		),
	).rejects.toThrow("AccessDenied");
	expect(bucket.put).toHaveBeenCalledOnce();
});

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
			"job",
			null,
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
			"job",
			null,
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
			"job",
			null,
		),
	).toEqual({ remaining: 0, generated: 1 });
	expect(
		new TextDecoder().decode(
			objects.get(readerDocumentKey("/ja/author/article"))?.bytes,
		),
	).toContain("記事本文");
	const writes = vi.mocked(bucket.put).mock.calls.length;
	await publishReaderDocuments(
		bucket,
		"build",
		catalog,
		render,
		"content",
		"ja",
		"job",
		null,
	);
	expect(render).toHaveBeenCalledOnce();
	expect(bucket.put).toHaveBeenCalledTimes(writes);
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: { "/ja/author/article": "edited" } },
		render,
		"content",
		"ja",
		"job",
		new Set(["/author/article"]),
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
		"job",
		null,
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
		"job",
		null,
	);
	await vi.waitFor(() => expect(render).toHaveBeenCalled());
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 3, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
		"job",
		null,
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
		"job",
		null,
	);
	await vi.waitFor(() => expect(render).toHaveBeenCalled());
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
		"job",
		null,
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
				"job",
				null,
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
		"job",
		null,
	);
	await publishReaderDocuments(
		bucket,
		"new-build",
		catalog,
		render,
		"deployment",
		"ja",
		"job",
		null,
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
		"job",
		null,
	);
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 2, documents: { "/ja/author/article": "edited" } },
		render,
		"content",
		"ja",
		"job",
		new Set(["/author/article"]),
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
		"job",
		null,
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
				"job",
				null,
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
			"job",
			null,
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
				"job",
				null,
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
		"job",
		null,
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
		"job",
		null,
	);
	await entered.promise;
	await publishReaderDocuments(
		bucket,
		"build",
		{ revision: 3, documents: {} },
		async () => new Response("見つかりません", { status: 404 }),
		"content",
		"ja",
		"job",
		null,
	);
	resume.resolve();
	await expect(old).rejects.toThrow("superseded");
	expect(objects.get(readerDocumentKey(path))?.customMetadata.revision).toBe(
		"3",
	);
});
