import { getReaderData } from "virtual:evame-reader-data";

export function fetchReaderData(
	origin: string,
	pathname: string,
	search: string,
	cookie: string | null,
	authorization: string | null,
) {
	const url = new URL("/api/reader-data", origin);
	url.searchParams.set("path", pathname);
	url.searchParams.set("search", search);
	const headers = { cookie: cookie ?? "", authorization: authorization ?? "" };
	return getReaderData(new Request(url, { headers }));
}
