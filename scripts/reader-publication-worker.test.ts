import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { R2Bucket } from "@cloudflare/workers-types";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

const secret = "local-reader-publication-test";
const ja = "/ja/incremental-study/first";
const en = "/en/incremental-study/first";
const endpoint =
	"https://example.test/__publication/article%3Aincremental-study%2Ffirst";
let directory: string;
let harness: ReturnType<typeof createTestHarness>;
let worker: ReturnType<ReturnType<typeof createTestHarness>["getWorker"]>;
beforeAll(async () => {
	directory = await mkdtemp(join(tmpdir(), "reader-publication-test-"));
	const configPath = join(directory, "wrangler.json");
	await writeFile(
		configPath,
		JSON.stringify({
			name: "reader-publication-test",
			main: fileURLToPath(
				new URL("./reader-publication-worker.ts", import.meta.url),
			),
			compatibility_date: "2026-11-06",
			r2_buckets: [{ binding: "HTML", bucket_name: "reader-publication-test" }],
			vars: {
				PUBLICATION_PREFIX: "study/test",
				PUBLICATION_SECRET: secret,
			},
		}),
	);
	harness = createTestHarness({ workers: [{ configPath }] });
	await harness.listen();
	worker = harness.getWorker("reader-publication-test");
});
afterAll(async () => {
	await harness?.close();
	if (directory) await rm(directory, { recursive: true, force: true });
});
beforeEach(async () => {
	const response = await worker.fetch(endpoint, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${secret}` },
	});
	expect(response.status).toBe(204);
});

it("同じWorkerのまま生成済みHTMLを差し替え日本語と英語へ反映する", async () => {
	for (const revision of [1, 2]) {
		const saved = await worker.fetch(endpoint, {
			method: "POST",
			headers: { Authorization: `Bearer ${secret}` },
			body: JSON.stringify({
				revision,
				pages: {
					[ja]: `<main>日本語${revision}</main>`,
					[en]: `<main>English${revision}</main>`,
				},
			}),
		});
		expect(saved.status).toBe(204);
		for (const [path, text] of [
			[ja, `日本語${revision}`],
			[en, `English${revision}`],
		]) {
			const response = await worker.fetch(`https://example.test${path}`);
			expect(response.status).toBe(200);
			expect(response.headers.get("X-Publication-Revision")).toBe(
				String(revision),
			);
			expect(response.headers.get("Cache-Control")).toBe("private, no-store");
			expect(await response.text()).toBe(`<main>${text}</main>`);
		}
	}
});

it("非公開化した後に古い生成結果が届いても全言語のHTMLを戻さない", async () => {
	for (const payload of [
		{ revision: 1, pages: { [ja]: "original", [en]: "original" } },
		{ revision: 3, pages: null },
	])
		expect(
			(
				await worker.fetch(endpoint, {
					method: "POST",
					headers: { Authorization: `Bearer ${secret}` },
					body: JSON.stringify(payload),
				})
			).status,
		).toBe(204);
	const stale = await worker.fetch(endpoint, {
		method: "POST",
		headers: { Authorization: `Bearer ${secret}` },
		body: JSON.stringify({ revision: 2, pages: { [ja]: "stale" } }),
	});
	expect(stale.status).toBe(409);
	for (const path of [ja, en])
		expect((await worker.fetch(`https://example.test${path}`)).status).toBe(
			404,
		);
});

it("同じ版と同じ本文の再送は成功し同じ版の違う本文は上書きしない", async () => {
	const payload = {
		revision: 1,
		pages: { [ja]: "original", [en]: "translated" },
	};
	for (const pages of [payload.pages, { [en]: "translated", [ja]: "original" }])
		expect(
			(
				await worker.fetch(endpoint, {
					method: "POST",
					headers: { Authorization: `Bearer ${secret}` },
					body: JSON.stringify({ ...payload, pages }),
				})
			).status,
		).toBe(204);
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ ...payload, pages: { [ja]: "different" } }),
			})
		).status,
	).toBe(409);
	expect(await (await worker.fetch(`https://example.test${ja}`)).text()).toBe(
		"original",
	);
});

it("表示形式とコメントページごとのHTMLを配信し非公開化でまとめて止める", async () => {
	const pages = {
		[ja]: "both",
		[`${ja}?view=source`]: "source",
		[`${en}?page=2`]: "comments",
	};
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 1, pages }),
			})
		).status,
	).toBe(204);
	for (const [path, html] of Object.entries(pages))
		expect(
			await (await worker.fetch(`https://example.test${path}`)).text(),
		).toBe(html);
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 2, pages: null }),
			})
		).status,
	).toBe(204);
	for (const path of Object.keys(pages))
		expect((await worker.fetch(`https://example.test${path}`)).status).toBe(
			404,
		);
});

it("非公開の版が進むと古い書き込みを条件で止める", async () => {
	const { HTML } = (await worker.getEnv()) as { HTML: R2Bucket };
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 1, pages: null }),
			})
		).status,
	).toBe(204);
	const previous = (await HTML.list({ prefix: "study/test/" })).objects[0];
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 3, pages: null }),
			})
		).status,
	).toBe(204);
	expect((await HTML.head(previous.key))?.etag).not.toBe(previous.etag);
	expect(
		await HTML.put(previous.key, "遅れて届いた生成結果", {
			onlyIf: { etagMatches: previous.etag },
		}),
	).toBeNull();
	expect((await worker.fetch(`https://example.test${ja}`)).status).toBe(404);
});

it("同じ記事のR2書き込みは1秒以上空けて同じキーを更新する", async () => {
	const { HTML } = (await worker.getEnv()) as { HTML: R2Bucket };
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 1, pages: { [ja]: "1" } }),
			})
		).status,
	).toBe(204);
	const previous = (await HTML.list({ prefix: "study/test/" })).objects[0];
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 2, pages: { [ja]: "2" } }),
			})
		).status,
	).toBe(204);
	const objects = (await HTML.list({ prefix: "study/test/" })).objects;
	expect(objects).toHaveLength(1);
	expect(objects[0].key).toBe(previous.key);
	expect(
		objects[0].uploaded.getTime() - previous.uploaded.getTime(),
	).toBeGreaterThanOrEqual(1000);
	expect(await (await worker.fetch(`https://example.test${ja}`)).text()).toBe(
		"2",
	);
});

it("1秒の待機中に届いた更新を最新の版だけにまとめる", async () => {
	const started = Date.now();
	const responses = await Promise.all(
		Array.from({ length: 20 }, (_, index) =>
			worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({
					revision: index + 1,
					pages: { [ja]: String(index + 1) },
				}),
			}),
		),
	);
	expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
	for (const response of responses) expect(response.status).toBe(204);
	const response = await worker.fetch(`https://example.test${ja}`);
	expect(response.headers.get("X-Publication-Revision")).toBe("20");
	expect(await response.text()).toBe("20");
});

it("待機中の最新操作が非公開化なら古いHTMLの更新をまとめて止める", async () => {
	const responses = await Promise.all(
		[
			{ revision: 1, pages: { [ja]: "old", [en]: "old" } },
			{ revision: 2, pages: { [ja]: "new", [en]: "new" } },
			{ revision: 3, pages: null },
		].map((payload) =>
			worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify(payload),
			}),
		),
	);
	for (const response of responses) expect(response.status).toBe(204);
	for (const path of [ja, en])
		expect((await worker.fetch(`https://example.test${path}`)).status).toBe(
			404,
		);
});

it("新しい公開後に遅れて届いた非公開化は最新のHTMLを消さない", async () => {
	for (const payload of [
		{ revision: 1, pages: null },
		{ revision: 3, pages: { [ja]: "latest" } },
	])
		expect(
			(
				await worker.fetch(endpoint, {
					method: "POST",
					headers: { Authorization: `Bearer ${secret}` },
					body: JSON.stringify(payload),
				})
			).status,
		).toBe(204);
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 2, pages: null }),
			})
		).status,
	).toBe(409);
	expect(await (await worker.fetch(`https://example.test${ja}`)).text()).toBe(
		"latest",
	);
});

it("並行した保存の再試行で最新の版を反映し古い保存では巻き戻さない", async () => {
	const concurrent = await Promise.all(
		[1, 2].map((revision) =>
			worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision, pages: { [ja]: String(revision) } }),
			}),
		),
	);
	for (const response of concurrent) {
		expect([204, 409, 429]).toContain(response.status);
		await response.arrayBuffer();
	}
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 2, pages: { [ja]: "2" } }),
			})
		).status,
	).toBe(204);
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 1, pages: { [ja]: "1" } }),
			})
		).status,
	).toBe(409);
	expect(await (await worker.fetch(`https://example.test${ja}`)).text()).toBe(
		"2",
	);
});

it("認証なしの保存と削除や登録外のURLを拒否する", async () => {
	for (const method of ["POST", "DELETE"])
		expect(
			(
				await worker.fetch(endpoint, {
					method,
					body: method === "POST" ? "{}" : undefined,
				})
			).status,
		).toBe(403);
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision: 1, pages: { "/other": "wrong" } }),
			})
		).status,
	).toBe(400);
	expect((await worker.fetch("https://example.test/unknown")).status).toBe(404);
});

it.each([0, -1, 1.5, "1", null])("不正な版%sを保存しない", async (revision) => {
	expect(
		(
			await worker.fetch(endpoint, {
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				body: JSON.stringify({ revision, pages: { [ja]: "text" } }),
			})
		).status,
	).toBe(400);
});
