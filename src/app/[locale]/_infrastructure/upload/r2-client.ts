import { env } from "cloudflare:workers";

export async function uploadToR2(file: File): Promise<string> {
	const key = `uploads/${Date.now()}-${crypto.randomUUID()}`;
	await env.UPLOADS.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});
	return import.meta.env.DEV
		? `/api/uploads/${key}`
		: `https://${process.env.CF_IMAGE_HOST || "images.evame.tech"}/${key}`;
}
