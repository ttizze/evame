import { readerDocumentPath } from "../../src/app/_domain/reader-document";
import { parseReaderRoute } from "../../src/app/_domain/reader-route";

export function includePreviousReaderPaths(
	documents: Record<string, string>,
	previousPaths: string[],
) {
	const result = { ...documents };
	for (const path of previousPaths) {
		if (Object.hasOwn(result, path)) continue;
		const url = new URL(path, "https://evame.tech");
		const route = parseReaderRoute(url.pathname, url.search);
		url.searchParams.delete("page");
		const base = readerDocumentPath(url.pathname, url.search);
		if (base && result[base]) result[path] = result[base];
		else if (route?.kind === "tag") result[path] = "empty-tag";
	}
	return result;
}
