// @ts-ignore
import { routes } from "virtual:remix/server-build";
import { generateSitemap } from "@nasa-gcn/remix-seo";
import type { SEOHandle } from "@nasa-gcn/remix-seo";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { serverOnly$ } from "vite-env-only/macros";
import {
	fetchAllPublishedPages,
	fetchAllUsersName,
} from "./functions/queries.server";

export async function loader({ request }: LoaderFunctionArgs) {
	return generateSitemap(request, routes, {
		siteUrl: process.env.CLIENT_URL || "https://evame.tech",
		headers: {
			"Cache-Control": "public, max-age=3600",
		},
	});
}

export const handle: SEOHandle = {
	getSitemapEntries: serverOnly$(async () => {
		const [pages, users] = await Promise.all([
			fetchAllPublishedPages(),
			fetchAllUsersName(),
		]);

		const pageEntries = pages.map((page) => ({
			route: `/user/${page.user.userName}/page/${page.slug}`,
			lastmod: page.updatedAt.toISOString(),
		}));

		const userEntries = users.map((user) => ({
			route: `/user/${user.userName}`,
			lastmod: user.updatedAt.toISOString(),
		}));

		return [...pageEntries, ...userEntries];
	}),
};
