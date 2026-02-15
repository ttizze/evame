const ALLOWED_REDIRECT_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function buildLoginUrl(requestUrl: URL, redirectUri: URL): URL {
	const next = new URL(requestUrl.pathname, requestUrl.origin);
	next.searchParams.set("redirect_uri", redirectUri.toString());

	const loginUrl = new URL("/auth/login", requestUrl.origin);
	loginUrl.searchParams.set("next", `${next.pathname}?${next.searchParams}`);
	return loginUrl;
}

export function parseCliRedirectUri(raw: string | null): URL | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "http:") return null;
	if (!ALLOWED_REDIRECT_HOSTS.has(url.hostname)) return null;
	if (!url.port) return null;
	if (url.username || url.password) return null;
	url.hash = "";
	return url;
}
