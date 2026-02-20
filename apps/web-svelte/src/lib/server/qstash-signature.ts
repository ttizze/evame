import { Receiver } from "@upstash/qstash";

function createReceiver() {
	if (
		!process.env.QSTASH_CURRENT_SIGNING_KEY ||
		!process.env.QSTASH_NEXT_SIGNING_KEY
	) {
		throw new Error(
			"QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY are not set",
		);
	}

	return new Receiver({
		currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
		nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
	});
}

export async function verifyQstashRequest(request: Request): Promise<string> {
	const signature =
		request.headers.get("upstash-signature") ??
		request.headers.get("Upstash-Signature");

	if (!signature) {
		throw new Error("Upstash-Signature header is required");
	}

	const body = await request.text();
	const receiver = createReceiver();
	await receiver.verify({
		signature,
		body,
		url: request.url,
		upstashRegion: request.headers.get("upstash-region") ?? undefined,
	});

	return body;
}
