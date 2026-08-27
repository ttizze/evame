export const SESSION_COOKIE_NAME = "digital_buddhism_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function assertCookieValue(value: string): void {
	if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
		throw new Error("Cookie値が不正です");
	}
}

export function serializeSessionCookie(
	token: string,
	maxAgeSeconds = SESSION_COOKIE_MAX_AGE_SECONDS,
): string {
	assertCookieValue(token);
	if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 0) {
		throw new RangeError("Cookieの有効期間が不正です");
	}

	return [
		`${SESSION_COOKIE_NAME}=${token}`,
		"Path=/",
		`Max-Age=${maxAgeSeconds}`,
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
	].join("; ");
}

export function clearSessionCookie(): string {
	return [
		`${SESSION_COOKIE_NAME}=`,
		"Path=/",
		"Max-Age=0",
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
	].join("; ");
}

export function getSessionTokenFromRequest(request: Request): string | null {
	const header = request.headers.get("cookie");
	if (!header) {
		return null;
	}

	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (
			separator < 0 ||
			part.slice(0, separator).trim() !== SESSION_COOKIE_NAME
		) {
			continue;
		}

		const value = part.slice(separator + 1).trim();
		return /^[A-Za-z0-9_-]+$/u.test(value) ? value : null;
	}

	return null;
}
