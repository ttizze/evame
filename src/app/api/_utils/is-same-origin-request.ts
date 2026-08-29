export function isSameOriginRequest(request: Request): boolean {
	const requestOrigin = new URL(request.url).origin;

	const origin = request.headers.get("origin");
	if (origin && !isSameOriginValue(origin, requestOrigin)) return false;

	const referer = request.headers.get("referer");
	if (referer && !isSameOriginValue(referer, requestOrigin)) return false;

	const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
	if (
		fetchSite &&
		fetchSite !== "same-origin" &&
		fetchSite !== "same-site" &&
		fetchSite !== "none"
	) {
		return false;
	}

	return true;
}

function isSameOriginValue(value: string, requestOrigin: string): boolean {
	try {
		return new URL(value).origin === requestOrigin;
	} catch {
		return false;
	}
}
