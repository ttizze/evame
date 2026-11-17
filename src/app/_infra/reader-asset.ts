import type {
	R2Bucket,
	Headers as WorkerHeaders,
} from "@cloudflare/workers-types";

export async function fetchReaderAsset(
	request: Request,
	assets: { fetch(request: Request): Promise<Response> },
	bucket: Pick<R2Bucket, "get" | "head">,
) {
	const response = await assets.fetch(request);
	if (response.status !== 404 || !["GET", "HEAD"].includes(request.method))
		return response;
	const key = `assets${new URL(request.url).pathname}`;
	const object =
		request.method === "HEAD" ? await bucket.head(key) : await bucket.get(key);
	if (!object) return response;
	const headers = new Headers();
	object.writeHttpMetadata(headers as unknown as WorkerHeaders);
	headers.set("ETag", object.httpEtag);
	headers.set("Content-Length", String(object.size));
	if (
		request.headers
			.get("If-None-Match")
			?.split(",")
			.some((value) => ["*", object.httpEtag].includes(value.trim()))
	)
		return new Response(null, { status: 304, headers });
	return new Response(
		"body" in object ? (object.body as ReadableStream) : null,
		{ headers },
	);
}
