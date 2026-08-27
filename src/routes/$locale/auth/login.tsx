import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";
import LoginPage from "@/app/[locale]/(common-layout)/auth/login/page";
import { normalizeRedirectPath } from "@/components/scripture/login-link";
import { isSupportedLocale } from "@/domain/locales";
import { hasLoginSession } from "./-login-data";

export const Route = createFileRoute("/$locale/auth/login")({
	validateSearch: z.object({
		next: z.string().optional(),
	}),
	loaderDeps: ({ search }) => ({ next: search.next }),
	loader: async ({ deps, params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();

		if (await hasLoginSession()) {
			throw redirect({
				href: normalizeRedirectPath(deps.next),
				throw: true,
			});
		}
	},
	head: () => ({
		meta: [{ name: "robots", content: "noindex,nofollow" }],
	}),
	component: LoginPage,
});
