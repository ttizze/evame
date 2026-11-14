import type {
	Fetcher,
	Request as WorkerRequest,
} from "@cloudflare/workers-types";

// GatewayのReader/App転送とAppの無効化で、プレビュー接続・秘密値・リダイレクト規則を共有する。
export async function fetchWorker(
	request: Request,
	binding: Fetcher | null,
	previewOrigin: string | null,
	previewSecret: string | null,
) {
	if (previewOrigin) {
		if (!previewSecret) throw new Error("Preview secret is required");
		const target = new URL(request.url);
		const origin = new URL(previewOrigin);
		target.protocol = origin.protocol;
		target.host = origin.host;
		const headers = new Headers(request.headers);
		headers.delete("host");
		headers.set("x-evame-preview-reader", previewSecret);
		return fetch(
			new Request(
				target,
				new Request(request, { headers, redirect: "manual" }),
			),
		);
	}
	if (!binding) throw new Error("Worker binding is required");
	return (await binding.fetch(
		new Request(request, { redirect: "manual" }) as unknown as WorkerRequest,
	)) as unknown as Response;
}
