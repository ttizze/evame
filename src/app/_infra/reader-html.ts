import type { R2Bucket } from "@cloudflare/workers-types";
import { readerCacheTags } from "../_domain/reader-cache-tags";

// 読み取りと更新記録で同じDBを識別し、URL自体をR2キーへ残さない。
async function readerDatabaseNamespace(databaseUrl: string) {
	if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is not defined");
	return (await readerCacheTags([databaseUrl]))[0];
}

export async function publishReaderChanges(
	bucket: Pick<R2Bucket, "head" | "list" | "put" | "delete">,
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
	if (tags.length === 0) return;
	for (const row of tags) {
		const key = `changes/${namespace}/${String(row.revision).padStart(16, "0")}/${row.tag}`;
		if (!(await bucket.head(key)))
			await bucket.put(key, "", { onlyIf: { etagDoesNotMatch: "*" } });
	}
	// 生成中→完成済みの順で調べる。索引への移動と重なっても両方から漏れない。
	for (const scope of [
		{
			prefix: `pending/${namespace}/`,
			revision: Math.max(...tags.map((row) => row.revision)),
			pending: true,
		},
		...tags.map((row) => ({
			prefix: `dependencies/${namespace}/${row.tag}/`,
			revision: row.revision,
			pending: false,
		})),
	]) {
		let cursor: string | undefined;
		do {
			const page = await bucket.list({
				prefix: scope.prefix,
				include: ["customMetadata"],
				...(cursor ? { cursor } : {}),
			});
			for (let start = 0; start < page.objects.length; start += 8) {
				const applied = await Promise.allSettled(
					page.objects.slice(start, start + 8).map(async (reference) => {
						const target = reference.customMetadata;
						if (!target?.htmlKey?.startsWith(`html/${namespace}/`))
							throw new Error("Invalid public HTML dependency");
						if (scope.pending && Number(target.revision) >= scope.revision)
							return;
						let object = await bucket.head(target.htmlKey);
						for (;;) {
							if (scope.pending) {
								// ETagが変われば、この生成はもう登録できない。
								if ((object?.etag ?? "") !== target.etag) break;
							} else {
								if (
									object?.customMetadata?.state !== "ready" ||
									object.customMetadata.generation !== target.generation
								)
									break;
								if (Number(object.customMetadata.revision) >= scope.revision)
									return;
							}
							const invalidated = await bucket.put(
								target.htmlKey,
								JSON.stringify({
									generation: crypto.randomUUID(),
								}),
								{
									onlyIf: object
										? { etagMatches: object.etag }
										: { etagDoesNotMatch: "*" },
									customMetadata: {
										state: "invalidated",
										revision: String(scope.revision),
									},
								},
							);
							if (invalidated) break;
							object = await bucket.head(target.htmlKey);
						}
						await bucket.delete(reference.key);
					}),
				);
				for (const result of applied)
					if (result.status === "rejected") throw result.reason;
			}
			cursor = page.truncated ? page.cursor : undefined;
		} while (cursor);
	}
}

export async function fetchReaderHtml(
	request: Request,
	bucket: Pick<R2Bucket, "get" | "put" | "delete">,
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
	const key = `html/${namespace}/${hash}`;
	const lookupStarted = performance.now();
	const stored = await bucket.get(key);
	if (
		stored?.customMetadata?.state === "ready" &&
		stored.customMetadata.generation
	) {
		const html = await stored.json<{
			headers: [string, string][];
			body: string;
		}>();
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
	// DBを読む前に固有キーで生成中の索引を登録する。同じHTMLへの登録PUTは不要。
	const generation = crypto.randomUUID();
	const pendingKey = `pending/${namespace}/${generation}`;
	await bucket.put(pendingKey, "", {
		customMetadata: {
			htmlKey: key,
			etag: stored?.etag ?? "",
			revision: stored?.customMetadata?.revision ?? "0",
		},
	});
	try {
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
			revision >= Number(stored?.customMetadata?.revision ?? 0) &&
			response.status === 200 &&
			response.headers.get("Content-Type")?.includes("text/html") &&
			tags.length > 0 &&
			!response.headers.has("Set-Cookie") &&
			!/private|no-store/i.test(response.headers.get("Cache-Control") ?? "")
		) {
			const body = await response.clone().text();
			const dependencies = tags.filter((tag) => tag !== "evame-public");
			try {
				// 完成済み索引を先に永続化し、HTML登録後に生成中索引を消す。
				for (let start = 0; start < dependencies.length; start += 8) {
					const indexed = await Promise.allSettled(
						dependencies
							.slice(start, start + 8)
							.map((tag) =>
								bucket.put(
									`dependencies/${namespace}/${tag}/${generation}`,
									"",
									{ customMetadata: { htmlKey: key, generation } },
								),
							),
					);
					for (const result of indexed)
						if (result.status === "rejected") throw result.reason;
				}
				await bucket.put(
					key,
					JSON.stringify({
						generation,
						headers: [...response.headers],
						body,
					}),
					{
						onlyIf: stored
							? { etagMatches: stored.etag }
							: { etagDoesNotMatch: "*" },
						httpMetadata: { contentType: "application/json" },
						customMetadata: {
							state: "ready",
							revision: String(revision),
							generation,
						},
					},
				);
			} catch (error) {
				// 競合したHTML fillだけは省略できる。保存側の無効化失敗は握り潰さない。
				if (
					!(error instanceof Error) ||
					!/429|\(10058\)|Too Many Requests/i.test(error.message)
				)
					throw error;
			}
			response.headers.set("X-Evame-HTML-Cache", "MISS");
		} else response.headers.set("X-Evame-HTML-Cache", "BYPASS");
		response.headers.set(
			"Server-Timing",
			`public_html;dur=${(performance.now() - lookupStarted).toFixed(1)}`,
		);
		return request.method === "HEAD" ? new Response(null, response) : response;
	} finally {
		await bucket.delete(pendingKey);
	}
}
