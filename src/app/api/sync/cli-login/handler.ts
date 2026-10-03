import { auth } from "@/auth";
import { findSessionTokenBySessionId } from "./_db/queries";
import { buildLoginUrl, parseCliRedirectUri } from "./_utils/redirect-uri";

export async function getSyncCliLogin(request: Request): Promise<Response> {
	const requestUrl = new URL(request.url);
	const redirectUri = parseCliRedirectUri(
		requestUrl.searchParams.get("redirect_uri"),
	);
	if (!redirectUri) {
		return Response.json({ error: "Invalid redirect_uri" }, { status: 400 });
	}

	const session = await auth.api.getSession({
		headers: request.headers,
	});
	if (!session?.session?.id) {
		return Response.redirect(buildLoginUrl(requestUrl, redirectUri), 307);
	}

	const dbSession = await findSessionTokenBySessionId(session.session.id);
	if (!dbSession || dbSession.expiresAt <= new Date()) {
		return Response.redirect(buildLoginUrl(requestUrl, redirectUri), 307);
	}

	const callbackUrl = new URL(redirectUri.toString());
	callbackUrl.searchParams.set("token", dbSession.token);
	return Response.redirect(callbackUrl, 307);
}
