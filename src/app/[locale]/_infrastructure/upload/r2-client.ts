import { env } from "cloudflare:workers";

/** 保存先を指定すると、同じ画像を送り直しても同じ場所へ上書きして同じURLを返す。 */
export async function uploadToR2(
	file: File,
	path: string | null,
): Promise<string> {
	const key = `uploads/${path ?? `${Date.now()}-${crypto.randomUUID()}`}`;
	await env.UPLOADS.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});
	return import.meta.env.DEV
		? `/api/uploads/${key}`
		: `https://${process.env.CF_IMAGE_HOST || "images.evame.tech"}/${key}`;
}
