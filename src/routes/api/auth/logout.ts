import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, getSessionTokenFromRequest } from "@/auth/cookies";
import { getAuthService } from "@/auth/runtime";
import type { AuthService } from "@/auth/service";

export async function handleLogout(
	request: Request,
	service: AuthService,
): Promise<Response> {
	const token = getSessionTokenFromRequest(request);
	if (token) {
		try {
			await service.logout(token);
		} catch {
			// Cookieの破棄はDB障害時も行い、クライアントに残った認証情報を消す。
		}
	}

	return new Response(null, {
		status: 204,
		headers: {
			"Cache-Control": "no-store",
			"Set-Cookie": clearSessionCookie(),
		},
	});
}

export const Route = createFileRoute("/api/auth/logout")({
	server: {
		handlers: {
			POST: async ({ request }) => handleLogout(request, getAuthService()),
		},
	},
});
