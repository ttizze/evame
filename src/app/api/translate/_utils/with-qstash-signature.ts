import { Receiver } from "@upstash/qstash";

type RequestHandler = (request: Request, params?: unknown) => Promise<Response>;

export function withQstashVerification(
	handler: RequestHandler,
): RequestHandler {
	return async (request, params) => {
		const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
		const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
		if (!currentSigningKey || !nextSigningKey) {
			throw new Error(
				"QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY are not set",
			);
		}

		const signature = request.headers.get("upstash-signature");
		if (!signature) {
			return new Response("`Upstash-Signature` header is missing", {
				status: 403,
			});
		}

		const receiver = new Receiver({
			currentSigningKey,
			nextSigningKey,
		});
		const body = await request.clone().text();
		const upstashRegion = request.headers.get("upstash-region");
		let isValid = false;
		try {
			isValid = await receiver.verify({
				signature,
				body,
				upstashRegion: upstashRegion ?? undefined,
			});
		} catch {
			// Invalid signatures are an authentication failure, not a server error.
		}
		if (!isValid) {
			return new Response("invalid signature", { status: 403 });
		}

		return handler(request, params);
	};
}
