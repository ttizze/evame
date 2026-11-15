import { fetchWorker } from "../../../shared/fetch-worker";
import {
	deleteReaderCacheInvalidations,
	storeReaderCacheInvalidations,
} from "../../db/mutations";
import {
	fetchReaderCacheInvalidations,
	fetchReaderPublicationPages,
	fetchReaderRevision,
} from "../../db/queries";
import { readerCacheTags } from "../_domain/reader-cache-tags";

export async function updateReaderPublication(
	changes: readonly { key: string }[],
	env: typeof import("cloudflare:workers").env,
	origin: string,
) {
	const enabled = Boolean(env.READER_PUBLICATION_PREFIX);
	if (changes.length > 0)
		await storeReaderCacheInvalidations(
			[
				...(await readerCacheTags(changes.map((row) => row.key))),
				...(enabled
					? changes
							.filter((row) => /^page:[1-9]\d*$/.test(row.key))
							.map((row) => `publication:${row.key}`)
					: []),
			],
			crypto.randomUUID(),
		);
	const pending = await fetchReaderCacheInvalidations();
	if (pending.length === 0) return;
	const tags = pending
		.filter((row) => row.tag.startsWith("reader:"))
		.map((row) => row.tag);
	let publication: { revision: number; paths: string[] } | null = null;
	if (enabled) {
		const ids = pending.flatMap((row) =>
			/^publication:page:[1-9]\d*$/.test(row.tag)
				? [Number(row.tag.slice("publication:page:".length))]
				: [],
		);
		const pages = ids.length ? await fetchReaderPublicationPages(ids) : [];
		publication = {
			revision: (await fetchReaderRevision()).revision,
			paths: pages.map(
				(page) =>
					`/${page.sourceLocale}/${encodeURIComponent(page.handle)}/${encodeURIComponent(page.slug)}`,
			),
		};
	}
	const response = await fetchWorker(
		new Request(new URL("/__invalidate", origin), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...publication, tags }),
		}),
		env.READER ?? null,
		env.PREVIEW_READER_ORIGIN ?? null,
		env.PREVIEW_READER_SECRET ?? null,
	);
	if (!response.ok) throw new Error("Reader cache invalidation failed");
	await deleteReaderCacheInvalidations(
		enabled ? pending : pending.filter((row) => row.tag.startsWith("reader:")),
	);
}
