export function getLocaleCookie(
	cookieHeader: string | null,
): string | undefined {
	if (!cookieHeader) return undefined;

	for (const cookie of cookieHeader.split(";")) {
		const separatorIndex = cookie.indexOf("=");
		if (separatorIndex === -1) continue;
		if (cookie.slice(0, separatorIndex).trim() !== "NEXT_LOCALE") continue;

		const rawValue = cookie.slice(separatorIndex + 1).trim();
		const value = rawValue.replace(/^"|"$/g, "");
		try {
			return decodeURIComponent(value);
		} catch {
			return undefined;
		}
	}

	return undefined;
}
