import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findSessionTokenBySessionId } from "./_db/queries";
import { buildLoginUrl, parseCliRedirectUri } from "./_utils/redirect-uri";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const redirectUri = parseCliRedirectUri(
		requestUrl.searchParams.get("redirect_uri"),
	);
	if (!redirectUri) {
		return NextResponse.json(
			{ error: "Invalid redirect_uri" },
			{ status: 400 },
		);
	}

	const session = await auth.api.getSession({
		headers: request.headers,
	});
	if (!session?.session?.id) {
		return NextResponse.redirect(buildLoginUrl(requestUrl, redirectUri));
	}

	const dbSession = await findSessionTokenBySessionId(session.session.id);
	if (!dbSession || dbSession.expiresAt <= new Date()) {
		return NextResponse.redirect(buildLoginUrl(requestUrl, redirectUri));
	}

	const callbackUrl = new URL(redirectUri.toString());
	callbackUrl.searchParams.set("token", dbSession.token);
	return NextResponse.redirect(callbackUrl);
}
