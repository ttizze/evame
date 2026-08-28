import { get } from "@vercel/edge-config";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { getMaintenancePath, shouldCheckMaintenance } from "./maintenance-gate";

const handleI18nRouting = createMiddleware(routing);

/* ────────────────────────────────────────────── */
/* ② メンテナンス判定 → locale付き /maintenance へ */
async function maintenanceGate(req: NextRequest) {
	const pathname = req.nextUrl.pathname;
	if (!shouldCheckMaintenance(pathname)) {
		return handleI18nRouting(req);
	}

	// Edge Config のキー名を好きに変えて OK
	const isOn = await get<boolean>("maintenance");

	// フラグが立っていて、かつ自分自身へのループでなければ rewrite
	if (isOn) {
		const maintenanceUrl = new URL(
			getMaintenancePath({
				pathname,
				cookieHeader: req.headers.get("cookie"),
				acceptLanguage: req.headers.get("accept-language"),
			}),
			req.url,
		);
		return NextResponse.rewrite(maintenanceUrl);
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
