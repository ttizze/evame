import { createFileRoute } from "@tanstack/react-router";
import { getSessionTokenFromRequest } from "@/auth/cookies";
import { DomainError, InvalidInputError, NotFoundError } from "@/domain/errors";
import { getDatabase } from "@/server/runtime";
import { getTranslationQueue } from "@/translation/runtime";
import { createAndEnqueueTranslationJob } from "@/translation/service";
import type {
	TranslationDatabase,
	TranslationQueue,
} from "@/translation/types";
import { parseTranslationJobRequest } from "@/translation/validation";

type JobDependencies = {
	db: TranslationDatabase;
	queue: TranslationQueue;
};

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}

function errorStatus(error: unknown): number {
	if (error instanceof InvalidInputError) return 400;
	if (error instanceof NotFoundError) return 404;
	if (error instanceof DomainError && error.code === "UNAUTHENTICATED")
		return 401;
	if (error instanceof DomainError && error.code === "FORBIDDEN") return 403;
	return 503;
}

function authorizationToken(request: Request): string | null {
	const authorization = request.headers.get("authorization");
	if (authorization?.startsWith("Bearer ")) {
		const token = authorization.slice("Bearer ".length).trim();
		if (token) return token;
	}
	return getSessionTokenFromRequest(request);
}

async function requestBody(
	request: Request,
): Promise<Record<string, unknown> | null> {
	try {
		const value: unknown = await request.json();
		if (typeof value !== "object" || value === null || Array.isArray(value))
			return null;
		return value as Record<string, unknown>;
	} catch {
		return null;
	}
}

export async function handleCreateTranslationJob(
	request: Request,
	dependencies: JobDependencies,
): Promise<Response> {
	const body = await requestBody(request);
	if (!body) return jsonResponse({ error: "invalid_request" }, 400);
	const token = authorizationToken(request);
	try {
		const idempotencyHeader = request.headers.get("idempotency-key")?.trim();
		if (
			idempotencyHeader &&
			body.idempotencyKey !== undefined &&
			body.idempotencyKey !== idempotencyHeader
		) {
			throw new InvalidInputError("Idempotency-Keyがbodyと一致しません");
		}
		const parsed = parseTranslationJobRequest(
			idempotencyHeader && body.idempotencyKey === undefined
				? { ...body, idempotencyKey: idempotencyHeader }
				: body,
			token ?? undefined,
		);
		const job = await createAndEnqueueTranslationJob(
			dependencies.db,
			dependencies.queue,
			parsed,
		);
		return jsonResponse({ job }, 202);
	} catch (error) {
		if (error instanceof DomainError) {
			return jsonResponse(
				{ error: error.code.toLowerCase() },
				errorStatus(error),
			);
		}
		return jsonResponse({ error: "temporarily_unavailable" }, 503);
	}
}

export const Route = createFileRoute("/api/translation-jobs")({
	server: {
		handlers: {
			POST: async ({ request }) =>
				handleCreateTranslationJob(request, {
					db: getDatabase(),
					queue: getTranslationQueue(),
				}),
		},
	},
});
