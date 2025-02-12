import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";

const handleI18nRouting = createMiddleware(routing);
export default auth(handleI18nRouting);

export const config = {
	matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
	],
};
