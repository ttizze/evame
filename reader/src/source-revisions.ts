import type {
	R2Bucket,
	Headers as WorkerHeaders,
} from "@cloudflare/workers-types";
import { putReaderObject } from "./put-object";

// 全言語共通の生成元を描画前に記録し、以前失敗した差分を別の保存へ持ち込まない。
export async function updateReaderSources(
	bucket: R2Bucket,
	catalog: { revision: number; sources: Record<string, string> },
) {
	const key = "publication/sources.json";
	const stored = await bucket.get(key);
	const previous = stored
		? await stored.json<{
				revision: number;
				sources: Record<string, { hash: string | null; revision: number }>;
			}>()
		: { revision: -1, sources: {} };
	if (previous.revision > catalog.revision)
		throw new Error("Reader publication superseded");
	const sources = Object.fromEntries(
		[
			...new Set([
				...Object.keys(previous.sources),
				...Object.keys(catalog.sources),
			]),
		].map((path) => {
			const hash = catalog.sources[path] ?? null;
			return [
				path,
				previous.sources[path]?.hash === hash
					? previous.sources[path]
					: { hash, revision: catalog.revision },
			];
		}),
	);
	if (
		previous.revision !== catalog.revision ||
		Object.keys(previous.sources).length !== Object.keys(sources).length ||
		Object.entries(sources).some(
			([path, source]) => previous.sources[path]?.hash !== source.hash,
		)
	) {
		const saved = await putReaderObject(
			bucket,
			key,
			JSON.stringify({ revision: catalog.revision, sources }),
			{
				onlyIf: stored
					? { etagMatches: stored.etag }
					: (new Headers({ "If-None-Match": "*" }) as unknown as WorkerHeaders),
				httpMetadata: { contentType: "application/json" },
			},
		);
		if (!saved) throw new Error("Reader publication superseded");
	}
	return Object.fromEntries(
		Object.entries(sources).map(([path, source]) => [path, source.revision]),
	);
}
