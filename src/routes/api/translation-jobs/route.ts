import { createFileRoute } from "@tanstack/react-router";
import type { Auth } from "@/auth/auth";
import { getSessionUser } from "@/auth/session";
import {
	DomainError,
	InvalidInputError,
	NotFoundError,
	UnauthenticatedError,
} from "@/domain/errors";
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
	auth?: Auth;
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
	try {
		const idempotencyHeader = request.headers.get("idempotency-key")?.trim();
		if (
			idempotencyHeader &&
			body.idempotencyKey !== undefined &&
			body.idempotencyKey !== idempotencyHeader
		) {
			throw new InvalidInputError("Idempotency-Keyがbodyと一致しません");
		}
		const user = await getSessionUser(request, dependencies.auth);
		if (!user?.id) throw new UnauthenticatedError();
		const parsed = parseTranslationJobRequest(
			idempotencyHeader && body.idempotencyKey === undefined
				? { ...body, idempotencyKey: idempotencyHeader }
				: body,
			user.id,
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
