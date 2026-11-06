import type {
	R2Bucket,
	Headers as WorkerHeaders,
} from "@cloudflare/workers-types";
import { readerDocumentKey } from "../../src/app/_domain/reader-document";
import { includePreviousReaderPaths } from "./publication-paths";

export async function publishReaderDocuments(
	bucket: R2Bucket,
	buildId: string,
	catalog: { revision: number; documents: Record<string, string> },
	render: (path: string) => Promise<Response>,
	mode: "content" | "deployment",
	locale: string,
) {
	const stateKey = `publication/${locale}.json`;
	const stored = await bucket.get(stateKey);
	const state = stored
		? await stored.json<{
				revision: number;
				documents: Record<string, string>;
			}>()
		: { revision: -1, documents: {} };
	if (state.revision > catalog.revision)
		throw new Error("Reader publication superseded");
	const previous = state.documents;
	const hashes = includePreviousReaderPaths(
		catalog.documents,
		Object.keys(previous),
	);
	const expected = Object.fromEntries(
		Object.entries(hashes).map(([path, hash]) => [path, `${buildId}:${hash}`]),
	);
	const removed = Object.keys(previous).filter(
		(path) => !Object.hasOwn(expected, path),
	);
	const changed = Object.keys(expected).filter((path) =>
		mode === "deployment"
			? previous[path] !== expected[path]
			: previous[path]?.startsWith("pending:content:") ||
				!previous[path]?.endsWith(`:${hashes[path]}`),
	);
	const pending = [...removed, ...changed];
	const batch = pending.slice(0, 96);
	const next = { ...previous };
	for (const path of changed) {
		if (
			mode === "deployment" &&
			previous[path]?.startsWith("pending:content:") &&
			previous[path]?.endsWith(`:${hashes[path]}`)
		)
			continue;
		next[path] = `pending:${mode}:${expected[path]}`;
	}
	// 生成中のURLも先に登録し、後続の非公開化が必ず404を書き込めるようにする。
	const registered = await bucket.put(
		stateKey,
		JSON.stringify({ revision: catalog.revision, documents: next }),
		{
			onlyIf: stored
				? { etagMatches: stored.etag }
				: (new Headers({ "If-None-Match": "*" }) as unknown as WorkerHeaders),
			httpMetadata: { contentType: "application/json" },
		},
	);
	if (!registered) throw new Error("Reader publication superseded");
	if (!batch.length) return { remaining: 0, generated: 0 };
	// 未公開化・削除を先に保存し、途中失敗しても旧本文へ戻さない。
	for (let offset = 0; offset < batch.length; offset += 6) {
		const results = await Promise.allSettled(
			batch.slice(offset, offset + 6).map(async (path) => {
				const response = Object.hasOwn(expected, path)
					? await render(path)
					: await render("/404");
				if (
					response.status !== 404 &&
					(!response.ok || response.headers.get("X-Evame-Public") !== "true")
				)
					throw new Error(
						`Public HTML generation failed: HTTP ${response.status}`,
					);
				if (response.headers.has("Set-Cookie"))
					throw new Error("Public HTML contains a session cookie");
				const html = await response.arrayBuffer();
				// R2のETagは本文で決まるため、同じ404でも版ごとに異なるETagにする。
				const revision = new TextEncoder().encode(
					`<!--evame-revision:${catalog.revision}-->`,
				);
				const body = new Uint8Array(html.byteLength + revision.byteLength);
				body.set(new Uint8Array(html));
				body.set(revision, html.byteLength);
				const key = readerDocumentKey(path);
				const current = await bucket.head(key);
				if (Number(current?.customMetadata?.revision ?? -1) > catalog.revision)
					throw new Error("Reader publication superseded");
				const saved = await bucket.put(key, body, {
					onlyIf: current
						? { etagMatches: current.etag }
						: (new Headers({
								"If-None-Match": "*",
							}) as unknown as WorkerHeaders),
					httpMetadata: { contentType: "text/html; charset=utf-8" },
					customMetadata: {
						revision: String(catalog.revision),
						status: String(response.status),
					},
				});
				if (!saved) throw new Error("Reader publication superseded");
				if (Object.hasOwn(expected, path)) next[path] = expected[path];
				else delete next[path];
			}),
		);
		for (const result of results)
			if (result.status === "rejected") throw result.reason;
	}
	const saved = await bucket.put(
		stateKey,
		JSON.stringify({ revision: catalog.revision, documents: next }),
		{
			onlyIf: { etagMatches: registered.etag },
			httpMetadata: { contentType: "application/json" },
		},
	);
	if (!saved) throw new Error("Reader publication superseded");
	return {
		remaining: pending.length - batch.length,
		generated: batch.length,
	};
}
