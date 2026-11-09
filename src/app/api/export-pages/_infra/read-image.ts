import { env } from "cloudflare:workers";

export async function readExportImage(key: string) {
	const object = await env.UPLOADS.get(key);
	if (!object) return null;
	const contentType =
		object.httpMetadata?.contentType?.split(";")[0].trim().toLowerCase() ??
		"application/octet-stream";
	if (
		contentType !== "application/octet-stream" &&
		!contentType.startsWith("image/")
	) {
		await object.body.cancel();
		return null;
	}
	return {
		body: object.body as unknown as ReadableStream<Uint8Array>,
		contentType,
	};
}
