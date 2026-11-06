import type {
	R2Bucket,
	Headers as WorkerHeaders,
} from "@cloudflare/workers-types";
import {
	readerDocumentKey,
	readerDocumentSourcePath,
} from "../../src/app/_domain/reader-document";
import { includePreviousReaderPaths } from "./publication-paths";
import { putReaderObject } from "./put-object";

export async function publishReaderDocuments(
	bucket: R2Bucket,
	versionId: string,
	catalog: { revision: number; documents: Record<string, string> },
	render: (path: string) => Promise<Response>,
	mode: "content" | "deployment",
	locale: string,
	publicationId: string,
	changedSources: ReadonlySet<string> | null,
	versionTimestamp: string,
) {
	const stateKey = `publication/${locale}.json`;
	const stored = await bucket.get(stateKey);
	const uploadedAt = Date.parse(versionTimestamp);
	if (!Number.isFinite(uploadedAt))
		throw new Error("Reader version timestamp unavailable");
	if (Date.parse(stored?.customMetadata?.timestamp ?? "") > uploadedAt)
		throw new Error("Reader deployment superseded");
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
		Object.entries(hashes).map(([path, hash]) => [
			path,
			`${versionId}:${hash}`,
		]),
	);
	const removed = Object.keys(previous).filter(
		(path) => !Object.hasOwn(expected, path),
	);
	const changed = Object.keys(expected).filter((path) => {
		if (mode === "deployment") return previous[path] !== expected[path];
		if (previous[path]?.startsWith(`pending:content:${publicationId}:`))
			return true;
		const differs = !previous[path]?.endsWith(`:${hashes[path]}`);
		if (changedSources === null)
			return previous[path]?.startsWith("pending:content:") || differs;
		let eligible = changedSources.has(readerDocumentSourcePath(path));
		if (!eligible && !Object.hasOwn(catalog.documents, path)) {
			const url = new URL(path, "https://evame.tech");
			url.searchParams.delete("page");
			eligible = changedSources.has(
				readerDocumentSourcePath(url.pathname + url.search),
			);
		}
		return eligible && (previous[path]?.startsWith("pending:") || differs);
	});
	const pending = [...removed, ...changed];
	if (!pending.length && state.revision === catalog.revision)
		return { remaining: 0, generated: 0 };
	const batch = pending.slice(0, 96);
	const next = { ...previous };
	for (const path of changed) {
		// 同じコードと生成元の保存は所有権を維持し、互いの描画を中断しない。
		if (
			previous[path]?.startsWith("pending:content:") &&
			previous[path]?.endsWith(`:${expected[path]}`)
		)
			continue;
		next[path] = `pending:${mode}:${publicationId}:${expected[path]}`;
	}
	// 生成中のURLも先に登録し、後続の非公開化が必ず404を書き込めるようにする。
	const registered = await putReaderObject(
		bucket,
		stateKey,
		JSON.stringify({ revision: catalog.revision, documents: next }),
		{
			onlyIf: stored
				? { etagMatches: stored.etag }
				: (new Headers({ "If-None-Match": "*" }) as unknown as WorkerHeaders),
			httpMetadata: { contentType: "application/json" },
			customMetadata: { version: versionId, timestamp: versionTimestamp },
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
				// 本文のETagを先に読み、その後に公開一覧の所有権を確認する。
				// 後続の生成が本文を置き換えた場合も、古い結果を書き戻さない。
				const publication = await bucket.head(stateKey);
				if (publication?.etag !== registered.etag) {
					if (publication?.customMetadata?.version !== versionId)
						throw new Error("Reader deployment superseded");
					throw new Error("Reader publication superseded");
				}
				if (Number(current?.customMetadata?.revision ?? -1) > catalog.revision)
					throw new Error("Reader publication superseded");
				const saved = await putReaderObject(bucket, key, body, {
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
	const saved = await putReaderObject(
		bucket,
		stateKey,
		JSON.stringify({ revision: catalog.revision, documents: next }),
		{
			onlyIf: { etagMatches: registered.etag },
			httpMetadata: { contentType: "application/json" },
			customMetadata: { version: versionId, timestamp: versionTimestamp },
		},
	);
	if (!saved) throw new Error("Reader publication superseded");
	return {
		remaining: pending.length - batch.length,
		generated: batch.length,
	};
}
