import type { Fetcher } from "@cloudflare/workers-types";

// GatewayのHTML・アセット・無効化で、同じReaderへの接続規則を共有する。
export async function fetchReader(
	url: string,
	init: {
		method: string;
		headers: Record<string, string>;
		body: string | null;
	},
	binding: Fetcher | null,
	previewOrigin: string | null,
	previewSecret: string | null,
) {
	if (previewOrigin) {
		if (!previewSecret) throw new Error("Preview Reader secret is required");
		const target = new URL(url);
		const origin = new URL(previewOrigin);
		target.protocol = origin.protocol;
		target.host = origin.host;
		const headers = new Headers(init.headers);
		headers.delete("host");
		headers.set("x-evame-preview-reader", previewSecret);
		return fetch(target.href, { ...init, headers, redirect: "manual" });
	}
	if (!binding) throw new Error("Reader binding is required");
	return (await binding.fetch(url, init)) as unknown as Response;
}
