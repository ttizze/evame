import { createFileRoute } from "@tanstack/react-router";
import { serializeSessionCookie } from "@/auth/cookies";
import { getAuthService } from "@/auth/runtime";
import { type AuthService, InvalidMagicLinkError } from "@/auth/service";

function jsonResponse(status: number): Response {
	return new Response(JSON.stringify({ ok: false, error: "invalid_link" }), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}

export async function handleMagicLinkVerification(
	request: Request,
	service: AuthService,
): Promise<Response> {
	const url = new URL(request.url);
	const token = url.searchParams.get("token");
	if (!token) {
		return jsonResponse(400);
	}

	try {
		const result = await service.verifyMagicLink({
			token,
			redirectTo: url.searchParams.get("next") ?? undefined,
		});
		return new Response(null, {
			status: 302,
			headers: {
				"Cache-Control": "no-store",
				Location: result.redirectPath,
				"Set-Cookie": serializeSessionCookie(
					result.sessionToken,
					result.sessionMaxAgeSeconds,
				),
			},
		});
	} catch (error) {
		if (error instanceof InvalidMagicLinkError) {
			return jsonResponse(400);
		}
		return jsonResponse(503);
	}
}

export const Route = createFileRoute("/api/auth/verify")({
	server: {
		handlers: {
			GET: async ({ request }) =>
				handleMagicLinkVerification(request, getAuthService()),
		},
	},
});
