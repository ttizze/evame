import { BASE_URL } from "@/app/_constants/base-url";
import { countPublicPages } from "@/app/_db/sitemap-queries.server";
import type { MetadataRoute } from "next";

const CHUNK = 1_000;

/**
 * Dynamic robots.txt generator.
 * Lists all generated sitemap chunk files: /sitemap/[id].xml  →  /sitemap/0.xml, /sitemap/1.xml, ...
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
	const total = await countPublicPages();
	const chunks = Math.ceil(total / CHUNK);
	const sitemaps = Array.from(
		{ length: chunks },
		(_, id) => `${BASE_URL}/sitemap/${id}.xml`,
	);

	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: sitemaps,
	};
}

// Force dynamic so that BASE_URL and DB-driven counts are always respected.
export const dynamic = "force-dynamic";
export const revalidate = 36000;
