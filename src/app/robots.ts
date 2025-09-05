import type { MetadataRoute } from "next";
import { BASE_URL } from "@/app/_constants/base-url";
import { countPublicPages } from "@/app/_db/sitemap-queries.server";

const CHUNK = 1_000;

/**
 * Dynamic robots.txt generator.
 * Lists all generated sitemap chunk files: /sitemap/[id].xml  →  /sitemap/0.xml, /sitemap/1.xml, ...
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
	const total = await countPublicPages();
	// 少なくとも 1 本は出す（/sitemap/sitemap/0.xml）
	const chunks = Math.max(1, Math.ceil(total / CHUNK));
	const sitemaps = Array.from(
		{ length: chunks },
		(_, id) => `${BASE_URL}/sitemap/sitemap/${id}.xml`,
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
