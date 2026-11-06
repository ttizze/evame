import { readerDocumentSourcePath } from "@/app/_domain/reader-document";
import { fetchReaderRevision } from "@/db/queries";
import { fetchReaderCatalogSources } from "../_db/queries";
import { buildReaderDocuments } from "../_domain/reader-documents";

let cached: {
	hour: number;
	source: Awaited<ReturnType<typeof fetchReaderCatalogSources>>;
	sources: Record<string, string>;
} | null = null;

export async function loadReaderCatalog(locale: string) {
	const previous = cached;
	const { revision } = await fetchReaderRevision();
	const hour = Math.floor(Date.now() / 3600000);
	let snapshot: NonNullable<typeof cached>;
	if (previous?.source.revision === revision && previous.hour === hour)
		snapshot = previous;
	else {
		const source = await fetchReaderCatalogSources();
		const sources = Object.fromEntries(
			Object.entries({
				...buildReaderDocuments(source, "ja"),
				...buildReaderDocuments(source, "en"),
			}).map(([path, hash]) => [readerDocumentSourcePath(path), hash]),
		);
		snapshot = { hour, source, sources };
		if (!cached || cached.source.revision <= source.revision) cached = snapshot;
	}
	return {
		revision: snapshot.source.revision,
		documents: buildReaderDocuments(snapshot.source, locale),
		sources: snapshot.sources,
	};
}
