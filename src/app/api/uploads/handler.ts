import { env } from "cloudflare:workers";

export async function getUpload(key: string) {
	if (!import.meta.env.DEV) return new Response(null, { status: 404 });
	const object = await env.UPLOADS.get(key);
	if (!object) return new Response(null, { status: 404 });
	return new Response(await object.arrayBuffer(), {
		headers: {
			"Content-Security-Policy": "default-src 'none'; sandbox",
			"Content-Type":
				object.httpMetadata?.contentType ?? "application/octet-stream",
		},
	});
}
