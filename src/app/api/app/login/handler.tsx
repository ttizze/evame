import { randomBytes } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { getAuth } from "@/auth";
import { messages } from "@/i18n/messages";
import { resolveMaintenanceLocale } from "@/maintenance-gate";
import { insertLoginCode } from "./_db/mutations";

const challengePattern = /^[A-Za-z0-9_-]{43}$/;

/**
 * アプリのログイン。システムの認証画面からWebのログインを経て、一回限りのコードだけをアプリへ返す。
 * トークンはアプリがコードとPKCEの元の乱数を送って受け取るため、同じURLスキームを名乗る別のアプリには渡らない。
 */
export async function getAppLogin(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const challenge = url.searchParams.get("code_challenge");
	if (!challenge || !challengePattern.test(challenge))
		return Response.json({ error: "Invalid code_challenge" }, { status: 400 });

	const session = await getAuth().api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		const login = new URL("/auth/login", url.origin);
		login.searchParams.set(
			"next",
			`${url.pathname}?code_challenge=${challenge}`,
		);
		return Response.redirect(login, 307);
	}

	const locale = resolveMaintenanceLocale({
		pathname: url.pathname,
		cookieHeader: request.headers.get("cookie"),
		acceptLanguage: request.headers.get("accept-language"),
	});
	const text = (messages[locale as keyof typeof messages] ?? messages.en)
		.AppLogin;
	return new Response(
		`<!doctype html>${renderToStaticMarkup(
			<html lang={locale}>
				<head>
					<meta charSet="utf-8" />
					<meta content="width=device-width, initial-scale=1" name="viewport" />
					<title>{text.title}</title>
				</head>
				<body>
					<main
						style={{
							fontFamily: "system-ui",
							maxWidth: "32rem",
							margin: "4rem auto",
							padding: "1.5rem",
						}}
					>
						<h1>{text.title}</h1>
						<p>@{session.user.handle}</p>
						<p>{text.description}</p>
						<form action="/api/app/login" method="post">
							<input name="code_challenge" type="hidden" value={challenge} />
							<button type="submit">{text.authorize}</button>
						</form>
						<p>
							<a href={`/${locale}`}>{text.cancel}</a>
						</p>
					</main>
				</body>
			</html>,
		)}`,
		{
			headers: {
				...PRIVATE_RESPONSE_HEADERS,
				"Content-Type": "text/html; charset=utf-8",
				"Content-Security-Policy":
					"default-src 'none'; style-src 'unsafe-inline'; form-action 'self' evame-editor:; frame-ancestors 'none'; base-uri 'none'",
				"Referrer-Policy": "no-referrer",
				"X-Frame-Options": "DENY",
			},
		},
	);
}

/** 許可ボタンからの同一オリジンPOSTだけがログインコードを発行する。 */
export async function postAppLogin(request: Request): Promise<Response> {
	const url = new URL(request.url);
	if (
		request.headers.get("origin") !== url.origin ||
		!isSameOriginRequest(request)
	)
		return Response.json(
			{ error: "Forbidden" },
			{ status: 403, headers: PRIVATE_RESPONSE_HEADERS },
		);
	const form = await request.formData().catch(() => null);
	const challenge = form?.get("code_challenge");
	if (typeof challenge !== "string" || !challengePattern.test(challenge))
		return Response.json(
			{ error: "Invalid code_challenge" },
			{ status: 400, headers: PRIVATE_RESPONSE_HEADERS },
		);
	const session = await getAuth().api.getSession({ headers: request.headers });
	if (!session?.user?.id)
		return Response.json(
			{ error: "Unauthorized" },
			{ status: 401, headers: PRIVATE_RESPONSE_HEADERS },
		);
	const code = randomBytes(32).toString("base64url");
	await insertLoginCode({
		code,
		userId: session.user.id,
		challenge,
		expiresAt: new Date(Date.now() + 5 * 60 * 1000),
	});
	return new Response(null, {
		status: 303,
		headers: {
			...PRIVATE_RESPONSE_HEADERS,
			Location: `evame-editor://auth?code=${code}`,
		},
	});
}
