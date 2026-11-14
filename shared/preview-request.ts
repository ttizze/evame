// ReaderとAppのPreviewは秘密値を検証し、認証・リンク生成に使うURLを公開Gatewayへ戻す。
export function restorePreviewRequest(
	request: Request,
	gatewayOrigin: string | null,
	secret: string | null,
) {
	if (!gatewayOrigin) return request;
	if (!secret || request.headers.get("x-evame-preview-reader") !== secret)
		return null;
	const url = new URL(request.url);
	const gateway = new URL(gatewayOrigin);
	url.protocol = gateway.protocol;
	url.host = gateway.host;
	const headers = new Headers(request.headers);
	headers.delete("x-evame-preview-reader");
	headers.delete("host");
	return new Request(url, new Request(request, { headers }));
}
