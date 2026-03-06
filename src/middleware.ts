import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

async function maintenanceGate(req: NextRequest) {
	if (
		process.env.MAINTENANCE_MODE === "true" &&
		!req.url.includes("/maintenance")
	) {
		return NextResponse.rewrite(new URL("/maintenance", req.url));
	}

	return handleI18nRouting(req);
}

export default maintenanceGate;

export const config = {
	matcher: [
		"/((?!api|_next|_vercel|privacy|terms|monitoring|maintenance|sitemap(?:$|/.*|\\.xml)|.*\\..*).*)",
	],
};
