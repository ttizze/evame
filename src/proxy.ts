import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/* ────────────────────────────────────────────── */
/* ② メンテナンス判定 → true なら /maintenance へ */
async function isMaintenanceOn(): Promise<boolean> {
	try {
		// Workers KV の MAINTENANCE_KV に "maintenance" キーを立てるとメンテナンスモードになる
		// (wrangler.jsonc の kv_namespaces を有効化して運用する)
		const { env } = getCloudflareContext();
		const kv = (
			env as {
				MAINTENANCE_KV?: { get(key: string): Promise<string | null> };
			}
		).MAINTENANCE_KV;
		const flag = await kv?.get("maintenance");
		return flag === "true" || flag === "1";
	} catch {
		// Cloudflare 外 (プレーンな next dev / next start など) では常に OFF
		return false;
	}
}

async function maintenanceGate(req: NextRequest) {
	// フラグが立っていて、かつ自分自身へのループでなければ rewrite
	if ((await isMaintenanceOn()) && !req.url.includes("/maintenance")) {
		return NextResponse.rewrite(new URL("/maintenance", req.url));
	}

	// 通常フローへ
	return handleI18nRouting(req);
}

/* ────────────────────────────────────────────── */
/* ③ メンテナンスゲート → i18n の順に合成 */
export default maintenanceGate;

/* ────────────────────────────────────────────── */
export const config = {
	// /maintenance だけは matcher から除外すると
	// 静的ページでも SSR ページでも好きに置ける
	matcher: [
		"/((?!api|_next|_vercel|privacy|terms|monitoring|maintenance|sitemap(?:$|/.*|\\.xml)|.*\\..*).*)",
	],
};
