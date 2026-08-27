export const DEFAULT_REDIRECT_PATH = "/";

function isSafeRelativePath(value: string): boolean {
	return (
		value.startsWith("/") &&
		!value.startsWith("//") &&
		!value.includes("\\") &&
		[...value].every((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code > 0x1f && code !== 0x7f;
		})
	);
}

/** 外部URL・スキーム相対URLを排除し、サイト内の遷移先だけ返す。 */
export function normalizeRedirectPath(
	value: string | undefined,
	origin: string,
	fallback = DEFAULT_REDIRECT_PATH,
): string {
	if (!value || !isSafeRelativePath(value)) {
		return fallback;
	}

	try {
		const url = new URL(value, origin);
		const baseOrigin = new URL(origin).origin;
		if (url.origin !== baseOrigin) {
			return fallback;
		}

		const path = `${url.pathname}${url.search}`;
		// URLの正規化で `/..//evil` が `//evil` になる場合も、
		// Locationのプロトコル相対URLとして扱われないようにする。
		return path.startsWith("//") ? fallback : path;
	} catch {
		return fallback;
	}
}

export function buildMagicLink(input: {
	origin: string;
	verifyPath: string;
	token: string;
	redirectTo?: string;
}): string {
	const origin = new URL(input.origin);
	if (!isSafeRelativePath(input.verifyPath)) {
		throw new Error("認証確認パスが不正です");
	}

	const url = new URL(input.verifyPath, origin);
	if (url.origin !== origin.origin) {
		throw new Error("認証確認パスが不正です");
	}

	url.searchParams.set("token", input.token);
	url.searchParams.set(
		"next",
		normalizeRedirectPath(input.redirectTo, origin.origin),
	);
	return url.toString();
}
