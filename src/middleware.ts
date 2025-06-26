import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { get } from "@vercel/edge-config";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

const handleI18nRouting = createMiddleware(routing);

/* ────────────────────────────────────────────── */
/* ② メンテナンス判定 → true なら /maintenance へ */
async function maintenanceGate(req: NextRequest) {
	// Edge Config のキー名を好きに変えて OK
	const isOn = await get<boolean>("maintenance");

	// フラグが立っていて、かつ自分自身へのループでなければ rewrite
	if (isOn && !req.url.includes("/maintenance")) {
		return NextResponse.rewrite(new URL("/maintenance", req.url));
	}

	// 通常フローへ
	return handleI18nRouting(req);
}

/* ────────────────────────────────────────────── */
/* ③ auth → maintenanceGate → i18n の順に合成     */
export default auth(maintenanceGate);

/* ────────────────────────────────────────────── */
export const config = {
	// /maintenance だけは matcher から除外すると
	// 静的ページでも SSR ページでも好きに置ける
	matcher: [
		"/((?!api|_next|_vercel|privacy|terms|monitoring|maintenance|.*\\..*).*)",
	],
};
