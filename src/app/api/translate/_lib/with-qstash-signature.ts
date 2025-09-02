import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import type { NextRequest } from "next/server";
export function withQstashVerification(
	handler:
		| ((request: Request, params?: unknown) => Promise<Response>)
		| ((request: NextRequest, params?: unknown) => Promise<Response>),
): (request: NextRequest, params?: unknown) => Promise<Response> {
	if (
		!process.env.QSTASH_CURRENT_SIGNING_KEY &&
		process.env.QSTASH_NEXT_SIGNING_KEY
	) {
		throw new Error(
			"QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY are not set",
		);
	}
	return verifySignatureAppRouter(handler, {
		currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
		nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
	});
}
