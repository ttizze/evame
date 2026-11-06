import { fetchReaderCatalogSources, fetchReaderRevision } from "../_db/queries";
import { buildReaderDocuments } from "../_domain/reader-documents";

let cached: {
	hour: number;
	source: Awaited<ReturnType<typeof fetchReaderCatalogSources>>;
} | null = null;

export async function loadReaderCatalog(locale: string) {
	const previous = cached;
	const { revision } = await fetchReaderRevision();
	const hour = Math.floor(Date.now() / 3600000);
	let source: Awaited<ReturnType<typeof fetchReaderCatalogSources>>;
	if (previous?.source.revision === revision && previous.hour === hour)
		source = previous.source;
	else {
		source = await fetchReaderCatalogSources();
		if (!cached || cached.source.revision <= source.revision)
			cached = { hour, source };
	}
	return {
		revision: source.revision,
		documents: buildReaderDocuments(source, locale),
	};
}
