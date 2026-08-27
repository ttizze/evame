import { createFileRoute } from "@tanstack/react-router";
import { getAuthService } from "@/auth/runtime";
import {
	type AuthService,
	EmailDeliveryError,
	InvalidEmailError,
} from "@/auth/service";

function jsonResponse(
	body: Record<string, boolean | string>,
	status: number,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}

async function readRequestBody(
	request: Request,
): Promise<Record<string, unknown> | null> {
	try {
		const value: unknown = await request.json();
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return null;
		}
		return value as Record<string, unknown>;
	} catch {
		return null;
	}
}

export async function handleMagicLinkRequest(
	request: Request,
	service: AuthService,
): Promise<Response> {
	const body = await readRequestBody(request);
	if (!body || typeof body.email !== "string") {
		return jsonResponse({ ok: false, error: "invalid_request" }, 400);
	}

	try {
		await service.requestMagicLink({
			email: body.email,
			requestIp: request.headers.get("CF-Connecting-IP") ?? undefined,
			redirectTo:
				typeof body.redirectTo === "string" ? body.redirectTo : undefined,
		});
		return jsonResponse({ ok: true }, 202);
	} catch (error) {
		if (error instanceof InvalidEmailError) {
			return jsonResponse({ ok: false, error: "invalid_request" }, 400);
		}
		if (error instanceof EmailDeliveryError) {
			return jsonResponse({ ok: false, error: "temporarily_unavailable" }, 503);
		}
		return jsonResponse({ ok: false, error: "temporarily_unavailable" }, 503);
	}
}

export const Route = createFileRoute("/api/auth/request")({
	server: {
		handlers: {
			POST: async ({ request }) =>
				handleMagicLinkRequest(request, getAuthService()),
		},
	},
});
