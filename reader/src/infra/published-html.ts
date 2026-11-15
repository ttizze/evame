import type { ExecutionContext, R2Bucket } from "@cloudflare/workers-types";
import { schedulePublication } from "../../../shared/infra/reader-publication";
import { parseReaderRoute } from "../../../src/app/_domain/reader-route";

export async function deletePublishedHtml(bucket: R2Bucket, prefix: string) {
	let cursor: string | undefined;
	do {
		const result = await bucket.list({ prefix: `${prefix}/`, cursor });
		if (result.objects.length)
			await bucket.delete(result.objects.map((object) => object.key));
		cursor = result.truncated ? result.cursor : undefined;
	} while (cursor);
}

// 無効化とHTML保存の両方に同じ版の条件付き書き込みを使い、別インスタンスの旧版を拒否する。
export async function invalidatePublishedHtml(
	bucket: R2Bucket,
	prefix: string,
	tags: readonly string[],
	revision: number,
	context: Pick<ExecutionContext, "waitUntil">,
) {
	await Promise.all(
		tags.map(async (tag) => {
			const key = `${prefix}/tags/${tag}`;
			for (let attempt = 0; attempt < 2; attempt++) {
				const status = await schedulePublication(
					bucket,
					key,
					revision,
					String(revision),
					String(revision),
					context,
				);
				if (
					status === 204 ||
					(status === 409 &&
						Number((await bucket.head(key))?.customMetadata?.revision) >=
							revision)
				)
					return;
				if (attempt === 0 && [429, 503].includes(status)) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
					continue;
				}
				throw new Error(`公開HTMLの無効化に失敗しました: HTTP ${status}`);
			}
		}),
	);
}

export async function servePublishedHtml(
	request: Request,
	bucket: R2Bucket,
	prefix: string,
	render: (request: Request) => Promise<Response>,
	context: Pick<ExecutionContext, "waitUntil">,
): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		try {
			const url = new URL(request.url);
			const route = parseReaderRoute(url.pathname, url.search);
			if (
				!route ||
				route.kind === "search" ||
				!["GET", "HEAD"].includes(request.method)
			)
				return render(request);
			const view = url.searchParams.get("view");
			url.search = "";
			if ("page" in route && route.page !== undefined && route.page > 1)
				url.searchParams.set("page", String(route.page));
			if (route.kind === "profile" && route.sort === "new")
				url.searchParams.set("sort", route.sort);
			if (view === "user" || view === "source")
				url.searchParams.set("view", view);
			// 全体無効化より前の生成結果は別世代のキーへ保存され、最新のHTMLを上書きしない。
			const generation =
				(await bucket.head(`${prefix}/generation`))?.etag ?? "initial";
			// 人気順などDBの変更通知によらない表示も、既存SSRと同じく最大1時間で読み直す。
			const urlHash = Array.from(
				new Uint8Array(
					await crypto.subtle.digest(
						"SHA-256",
						new TextEncoder().encode(url.origin + url.pathname + url.search),
					),
				),
				(byte) => byte.toString(16).padStart(2, "0"),
			).join("");
			const key = `${prefix}/html/${generation}/${Math.floor(Date.now() / 3600000)}/${urlHash}`;
			const object = await bucket.get(key);
			if (object) {
				const record = await object.json<{
					revision: number;
					tags: string[];
					html: string;
				}>();
				const epochs = await Promise.all(
					record.tags.map((tag) => bucket.head(`${prefix}/tags/${tag}`)),
				);
				if (
					epochs.every(
						(epoch) =>
							Number(epoch?.customMetadata?.revision ?? 0) <= record.revision,
					)
				)
					return new Response(request.method === "HEAD" ? null : record.html, {
						headers: {
							"Content-Type": "text/html; charset=utf-8",
							"Cache-Control": "private, no-store",
							"X-Evame-HTML": "publication",
							"X-Publication-Revision": String(record.revision),
						},
					});
			}
			// HEADでも保存するHTML全体を生成する。Cookie・認証ヘッダーは保存しない。
			const response = await render(
				new Request(new Request(url, request), { method: "GET" }),
			);
			const tagHeader = response.headers.get("X-Publication-Tags");
			const revision = Number(response.headers.get("X-Publication-Revision"));
			if (
				response.status !== 200 ||
				!tagHeader ||
				response.headers.has("Set-Cookie") ||
				!Number.isSafeInteger(revision)
			)
				return response;
			const tags = tagHeader.split(",");
			const epochs = await Promise.all(
				tags.map((tag) => bucket.head(`${prefix}/tags/${tag}`)),
			);
			if (
				epochs.some(
					(epoch) => Number(epoch?.customMetadata?.revision ?? 0) > revision,
				)
			)
				throw new Error("公開HTMLの生成中に新しい版へ更新されました");
			const html = await response.text();
			const body = JSON.stringify({ revision, tags, html });
			const hash = Array.from(
				new Uint8Array(
					await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
				),
				(byte) => byte.toString(16).padStart(2, "0"),
			).join("");
			const status = await schedulePublication(
				bucket,
				key,
				revision,
				hash,
				body,
				context,
			);
			if (status !== 204)
				throw new Error(`公開HTMLの保存に失敗しました: HTTP ${status}`);
			const latest = await Promise.all(
				tags.map((tag) => bucket.head(`${prefix}/tags/${tag}`)),
			);
			if (
				latest.some(
					(epoch) => Number(epoch?.customMetadata?.revision ?? 0) > revision,
				)
			)
				throw new Error("公開HTMLの保存中に新しい版へ更新されました");
			return new Response(request.method === "HEAD" ? null : html, {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					"Cache-Control": "private, no-store",
					"X-Evame-HTML": "publication",
					"X-Publication-Revision": String(revision),
				},
			});
		} catch (error) {
			if (attempt === 1) throw error;
			// 生成やR2の競合時は、1秒後に最新DBから描画し直す。
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
}
