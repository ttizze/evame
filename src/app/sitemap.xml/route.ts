import { NextResponse } from "next/server";
import { BASE_URL } from "@/app/_constants/base-url";
import { countPublicPages } from "@/app/_db/sitemap-queries.server";

const CHUNK = 1_000;

/**
 * GET /sitemap.xml
 * ───────────────────
 * <sitemapindex> を返す。
 */
export async function GET() {
	const total = await countPublicPages();
	// id=0 は静的ルートを含めるため、最低 1 チャンクは出す
	const chunks = Math.max(1, Math.ceil(total / CHUNK));

	const sitemapItems = Array.from({ length: chunks }, (_, id) => {
		return `<sitemap>
      <loc>${BASE_URL}/sitemap/sitemap/${id}.xml</loc>
    </sitemap>`;
	}).join("");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemapItems}
    </sitemapindex>`;

	return new NextResponse(xml, {
		headers: { "Content-Type": "application/xml" },
	});
}

// 動的生成させたい場合は:
export const dynamic = "force-dynamic";
