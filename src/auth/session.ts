import { UnauthenticatedError } from "@/domain/errors";
import type { Auth } from "./auth";
import { getAuth } from "./runtime";

/** リクエストCookieをBetter Authへ渡し、認証済みセッションを取得する境界。 */
export function getSession(request: Request, auth: Auth = getAuth()) {
	return auth.api.getSession({ headers: request.headers });
}

export async function getSessionUser(request: Request, auth?: Auth) {
	const result = await getSession(request, auth);
	return result?.user ?? null;
}

/** 認証済みユーザーIDを、Better Authが検証したセッションからだけ取得する。 */
export async function requireSessionUser(request: Request, auth?: Auth) {
	const user = await getSessionUser(request, auth);
	if (!user?.id) throw new UnauthenticatedError();
	return user;
}
