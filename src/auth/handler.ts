import type { Auth } from "./auth";

const REDIRECT_FIELDS = [
	"callbackURL",
	"errorCallbackURL",
	"newUserCallbackURL",
	"redirectTo",
] as const;

const SAFE_RELATIVE_REDIRECT =
	/^\/(?!\/|\\|%2f|%5c)[\w\-.+/@]*(?:\?[\w\-.+/=&%@]*)?$/iu;

function isSafeRedirect(value: string, baseURL: string): boolean {
	if (SAFE_RELATIVE_REDIRECT.test(value)) return true;
	try {
		const url = new URL(value);
		const origin = new URL(baseURL).origin;
		return url.origin === origin && !url.username && !url.password;
	} catch {
		return false;
	}
}

function invalidCallbackResponse(): Response {
	return new Response(
		JSON.stringify({
			message: "Invalid callbackURL",
			code: "INVALID_CALLBACK_URL",
		}),
		{
			status: 400,
			headers: { "content-type": "application/json" },
		},
	);
}

function unsafeRedirectField(
	value: unknown,
	baseURL: string,
): (typeof REDIRECT_FIELDS)[number] | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	for (const field of REDIRECT_FIELDS) {
		const candidate = Reflect.get(value, field);
		if (candidate !== undefined && typeof candidate === "string") {
			if (!isSafeRedirect(candidate, baseURL)) return field;
		}
	}
	return undefined;
}

async function hasUnsafeRedirect(
	request: Request,
	baseURL: string,
): Promise<boolean> {
	const url = new URL(request.url);
	for (const field of REDIRECT_FIELDS) {
		const value = url.searchParams.get(field);
		if (value !== null && !isSafeRedirect(value, baseURL)) return true;
	}
	if (request.method === "GET" || request.method === "HEAD") return false;
	if (
		!request.headers
			.get("content-type")
			?.toLowerCase()
			.includes("application/json")
	) {
		return false;
	}
	try {
		const body: unknown = await request.clone().json();
		return unsafeRedirectField(body, baseURL) !== undefined;
	} catch {
		return false;
	}
}

/**
 * TanStack Start の認証境界。
 * Better Auth の署名Cookie・OAuth state・セッション処理へ委譲する前に、
 * リダイレクト先だけを同一オリジンまたは安全な相対パスへ制限する。
 */
export async function handleAuthRequest(
	request: Request,
	auth: Auth,
): Promise<Response> {
	const baseURL = auth.options.baseURL;
	if (typeof baseURL !== "string") {
		throw new Error("認証のベースURLが不正です");
	}
	if (await hasUnsafeRedirect(request, baseURL))
		return invalidCallbackResponse();
	return auth.handler(request);
}

export { isSafeRedirect };
