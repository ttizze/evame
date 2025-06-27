import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { supportedLocaleOptions } from "@/app/_constants/locale";
export const routing = defineRouting({
	// A list of all locales that are supported
	locales: supportedLocaleOptions.map((locale) => locale.code),

	// Used when no locale matches
	defaultLocale: "en",
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
	createNavigation(routing);
