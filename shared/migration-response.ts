import { withSecurityHeaders } from "../security-headers";

// 公開表示と編集・APIで、DB接続前に返す停止応答を揃える。
export function getMigrationResponse(flag: string | undefined) {
	return flag === "true"
		? withSecurityHeaders(
				new Response(null, { status: 503, headers: { "Retry-After": "60" } }),
			)
		: null;
}
