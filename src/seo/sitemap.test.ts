import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml } from "./sitemap";

describe("公開仏典の sitemap", () => {
	it("locale 一覧と公開済み仏典だけを XML に含める", () => {
		const xml = buildSitemapXml({
			origin: "https://digital-buddhism.example/",
			locales: ["en", "ja"],
			slugs: ["dhammapada", "sutta & one"],
		});

		expect(xml).toContain("<loc>https://digital-buddhism.example/en</loc>");
		expect(xml).toContain(
			"<loc>https://digital-buddhism.example/ja/dhammapada</loc>",
		);
		expect(xml).toContain(
			"https://digital-buddhism.example/en/sutta%20%26%20one",
		);
		expect(xml).toContain(
			'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
		);
		expect(xml).not.toContain("unpublished");
	});

	it("robots.txt から API と sitemap の場所を示す", () => {
		expect(buildRobotsTxt("https://digital-buddhism.example/")).toBe(
			"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /login\nSitemap: https://digital-buddhism.example/sitemap.xml\n",
		);
	});
});
