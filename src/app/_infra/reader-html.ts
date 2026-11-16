import type { R2Bucket } from "@cloudflare/workers-types";
import { readerCacheTags } from "../_domain/reader-cache-tags";

// HTMLは生成開始から1時間で失効する。更新記録はこれより長く保持する。
const maxAge = 3_600_000;
const changeLimit = 1000;

// 読み取りと変更記録で同じDBを識別し、URL自体をR2キーへ残さない。
async function readerDatabaseNamespace(databaseUrl: string) {
	if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is not defined");
	return (await readerCacheTags([databaseUrl]))[0];
}

export async function publishReaderChanges(
	bucket: Pick<R2Bucket, "head" | "put">,
	databaseUrl: string,
	changes: readonly { key: string; revision: number }[],
) {
	const namespace = await readerDatabaseNamespace(databaseUrl);
	const tags = await Promise.all(
		changes.map(async (row) => ({
			tag: (await readerCacheTags([row.key]))[0],
			revision: row.revision,
		})),
	);
	for (const row of tags) {
		const key = `changes/${namespace}/${String(row.revision).padStart(16, "0")}/${row.tag}`;
		if (await bucket.head(key)) continue;
		await bucket.put(key, "", { onlyIf: { etagDoesNotMatch: "*" } });
	}
}

export async function fetchReaderHtml(
	request: Request,
	bucket: Pick<R2Bucket, "get" | "list" | "put">,
	build: string,
	databaseUrl: string,
	render: (
		request: Request,
	) => Promise<{ revision: number; response: Response }>,
) {
	if (request.method !== "GET" && request.method !== "HEAD")
		return (await render(request)).response;
	const namespace = await readerDatabaseNamespace(databaseUrl);
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(request.url),
	);
	const hash = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	const key = `html/${namespace}/${build}/${hash}`;
	const stored = await bucket.get(key);
	if (stored) {
		const html = await stored.json<{
			startedAt: number;
			revision: number;
			tags: string[];
			headers: [string, string][];
			body: string;
		}>();
		if (Date.now() - html.startedAt < maxAge) {
			const changes = await bucket.list({
				prefix: `changes/${namespace}/`,
				startAfter: `changes/${namespace}/${String(html.revision).padStart(16, "0")}/~`,
				limit: changeLimit,
			});
			if (
				!changes.truncated &&
				!changes.objects.some((object) =>
					html.tags.includes(object.key.split("/")[3]),
				)
			) {
				const response = new Response(
					request.method === "HEAD" ? null : html.body,
					{ headers: html.headers },
				);
				response.headers.set("X-Evame-HTML-Cache", "HIT");
				return response;
			}
		}
	}
	const startedAt = Date.now();
	const { revision, response: source } = await render(
		request.method === "HEAD"
			? new Request(request, { method: "GET" })
			: request,
	);
	const response = new Response(source.body, source);
	const tags =
		response.headers.get("Cache-Tag")?.split(",").filter(Boolean) ?? [];
	if (
		Number.isSafeInteger(revision) &&
		revision >= 0 &&
		response.status === 200 &&
		response.headers.get("Content-Type")?.includes("text/html") &&
		tags.length > 0 &&
		!response.headers.has("Set-Cookie") &&
		!/private|no-store/i.test(response.headers.get("Cache-Control") ?? "")
	) {
		const body = await response.clone().text();
		try {
			await bucket.put(
				key,
				JSON.stringify({
					startedAt,
					revision,
					tags,
					headers: [...response.headers],
					body,
				}),
				{
					onlyIf: stored
						? { etagMatches: stored.etag }
						: { etagDoesNotMatch: "*" },
					httpMetadata: { contentType: "application/json" },
				},
			);
		} catch (error) {
			// 同一URLへの並行fillはR2の書き込み制限に当たる場合がある。
			// HTML保存だけは省略できるが、更新記録の読み書き失敗は握り潰さない。
			if (
				!(error instanceof Error) ||
				!/429|Too Many Requests/i.test(error.message)
			)
				throw error;
		}
		response.headers.set("X-Evame-HTML-Cache", "MISS");
	} else {
		response.headers.set("X-Evame-HTML-Cache", "BYPASS");
	}
	return request.method === "HEAD" ? new Response(null, response) : response;
}
