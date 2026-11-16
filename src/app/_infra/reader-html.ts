import type { R2Bucket, R2Object } from "@cloudflare/workers-types";
import { readerCacheTags } from "../_domain/reader-cache-tags";

// HTMLは生成開始から1時間で失効する。更新記録はこれより長く保持する。
const maxAge = 3_600_000;

// 読み取りと変更記録で同じDBを識別し、URL自体をR2キーへ残さない。
async function readerDatabaseNamespace(databaseUrl: string) {
	if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is not defined");
	return (await readerCacheTags([databaseUrl]))[0];
}

export async function publishReaderChanges(
	bucket: Pick<R2Bucket, "head" | "list" | "put">,
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
	// 閲覧時のLISTをなくす。生成前に登録した枠も含め、保存応答前に無効化する。
	let cursor: string | undefined;
	do {
		const page = await bucket.list({
			prefix: `html/${namespace}/`,
			include: ["customMetadata"],
			...(cursor ? { cursor } : {}),
		});
		for (let start = 0; start < page.objects.length; start += 8) {
			const applied = await Promise.allSettled(
				page.objects.slice(start, start + 8).map(async (listed) => {
					let object: R2Object | null = listed;
					while (object) {
						const metadata = object.customMetadata;
						if (metadata?.state === "invalidated") break;
						const revision = Number(metadata?.revision ?? 0);
						const dependencies = metadata?.tags?.split(",");
						const affected = tags.filter(
							(row) =>
								row.revision > revision &&
								(metadata?.state !== "ready" ||
									!dependencies ||
									metadata.tags === "" ||
									dependencies.includes(row.tag)),
						);
						if (affected.length === 0) break;
						const invalidated = await bucket.put(
							object.key,
							JSON.stringify({ startedAt: 0, generation: crypto.randomUUID() }),
							{
								onlyIf: { etagMatches: object.etag },
								customMetadata: {
									state: "invalidated",
									revision: String(
										Math.max(...affected.map((row) => row.revision)),
									),
								},
							},
						);
						if (invalidated) break;
						// LISTの後に生成が完了しても、現在の版と依存を再確認して取りこぼさない。
						object = await bucket.head(object.key);
					}
				}),
			);
			for (const result of applied)
				if (result.status === "rejected") throw result.reason;
		}
		cursor = page.truncated ? page.cursor : undefined;
	} while (cursor);
}

export async function fetchReaderHtml(
	request: Request,
	bucket: Pick<R2Bucket, "get" | "put">,
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
	const lookupStarted = performance.now();
	let stored = await bucket.get(key);
	let registered: R2Object;
	for (;;) {
		if (stored?.customMetadata?.state === "ready") {
			const html = await stored.json<{
				startedAt: number;
				headers: [string, string][];
				body: string;
			}>();
			if (Date.now() - html.startedAt < maxAge) {
				const response = new Response(
					request.method === "HEAD" ? null : html.body,
					{ headers: html.headers },
				);
				response.headers.set("X-Evame-HTML-Cache", "HIT");
				response.headers.set(
					"Server-Timing",
					`r2;dur=${(performance.now() - lookupStarted).toFixed(1)}`,
				);
				return response;
			}
		}
		if (stored?.customMetadata?.state === "pending") {
			registered = stored;
			break;
		}
		const registration = await bucket.put(
			key,
			JSON.stringify({ startedAt: 0, generation: crypto.randomUUID() }),
			{
				onlyIf: stored
					? { etagMatches: stored.etag }
					: { etagDoesNotMatch: "*" },
				customMetadata: {
					state: "pending",
					revision: stored?.customMetadata?.revision ?? "0",
				},
			},
		);
		if (registration) {
			registered = registration;
			break;
		}
		stored = await bucket.get(key);
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
		revision >= Number(registered.customMetadata?.revision ?? 0) &&
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
					generation: crypto.randomUUID(),
					startedAt,
					headers: [...response.headers],
					body,
				}),
				{
					onlyIf: { etagMatches: registered.etag },
					httpMetadata: { contentType: "application/json" },
					customMetadata: {
						state: "ready",
						revision: String(revision),
						// R2のmetadata上限を超える依存は、保存側で保守的に全変更へ追従する。
						tags: tags.join(",").length <= 1800 ? tags.join(",") : "",
					},
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
	response.headers.set(
		"Server-Timing",
		`public_html;dur=${(performance.now() - lookupStarted).toFixed(1)}`,
	);
	return request.method === "HEAD" ? new Response(null, response) : response;
}
