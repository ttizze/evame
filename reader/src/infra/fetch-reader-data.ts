import { env } from "cloudflare:workers";

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
	return env.PREVIEW_GATEWAY_ORIGIN
		? fetch(url.href, { headers })
		: env.BACKEND.fetch(url.href, { headers });
}
