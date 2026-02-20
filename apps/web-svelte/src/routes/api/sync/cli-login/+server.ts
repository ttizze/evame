import { json, type RequestHandler } from "@sveltejs/kit";
import { findSessionTokenBySessionId } from "@/app/api/sync/cli-login/_db/queries";
import {
	buildLoginUrl,
	parseCliRedirectUri,
} from "@/app/api/sync/cli-login/_utils/redirect-uri";

function redirectTo(location: URL) {
	return new Response(null, {
		status: 302,
		headers: {
			location: location.toString(),
		},
	});
}

export const GET: RequestHandler = async ({ locals, request }) => {
	const requestUrl = new URL(request.url);
	const redirectUri = parseCliRedirectUri(
		requestUrl.searchParams.get("redirect_uri"),
	);
	if (!redirectUri) {
		return json({ error: "Invalid redirect_uri" }, { status: 400 });
	}

	if (!locals.session?.id) {
		return redirectTo(buildLoginUrl(requestUrl, redirectUri));
	}

	const dbSession = await findSessionTokenBySessionId(locals.session.id);
	if (!dbSession || dbSession.expiresAt <= new Date()) {
		return redirectTo(buildLoginUrl(requestUrl, redirectUri));
	}

	const callbackUrl = new URL(redirectUri.toString());
	callbackUrl.searchParams.set("token", dbSession.token);
	return redirectTo(callbackUrl);
};
