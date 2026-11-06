import { createParser } from "nuqs";
import { parseReaderPage } from "@/app/_domain/reader-route";

export const readerPageQueryState = createParser({
	parse: parseReaderPage,
	serialize: String,
}).withDefault(1);

export function paginationUrl(
	pathname: string,
	search: string,
	page: number,
	hash: string,
) {
	const params = new URLSearchParams(search);
	params.set("page", String(page));
	return `${pathname}?${params}${hash}`;
}
