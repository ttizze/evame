import { SENTRY_DSN } from "@/_utils/sentry-dsn";

export async function postMonitoring(request: Request) {
	const body = await request.arrayBuffer();
	const bytes = new Uint8Array(body);
	const headerEnd = bytes.indexOf(10);
	if (headerEnd === -1)
		return new Response("Invalid Sentry envelope", { status: 400 });
	try {
		const header = JSON.parse(
			new TextDecoder().decode(bytes.subarray(0, headerEnd)),
		);
		if (header?.dsn !== SENTRY_DSN)
			return new Response("Invalid Sentry DSN", { status: 400 });
	} catch {
		return new Response("Invalid Sentry envelope", { status: 400 });
	}
	return fetch(
		"https://o4507906314207232.ingest.us.sentry.io/api/4508805630263296/envelope/",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-sentry-envelope" },
			body,
		},
	);
}
