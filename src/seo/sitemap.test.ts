import { describe, expect, it } from "vitest";
import { supportedLocales } from "@/domain/locales";
import { buildRobotsTxt, buildSitemapXml } from "./sitemap";

describe("公開仏典の sitemap", () => {
	it("locale 一覧と公開済み仏典だけを XML に含める", () => {
		const xml = buildSitemapXml({
			origin: "https://digital-buddhism.example/",
			locales: ["en", "ja"],
			entries: [
				{ handle: "tipitaka", slug: "dhammapada" },
				{ handle: "researcher", slug: "sutta & one" },
			],
		});

		expect(xml).toContain("<loc>https://digital-buddhism.example/en</loc>");
		expect(xml).toContain(
			"<loc>https://digital-buddhism.example/ja/tipitaka/dhammapada</loc>",
		);
		expect(xml).toContain(
			"https://digital-buddhism.example/en/researcher/sutta%20%26%20one",
		);
		expect(xml).toContain(
			'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
		);
		expect(xml).not.toContain("unpublished");
	});

	it("robots.txt から API と sitemap の場所を示す", () => {
		const body = buildRobotsTxt("https://digital-buddhism.example/");
		expect(body).toContain("Disallow: /api/");
		expect(body).toContain("Disallow: /login");
		for (const { code } of supportedLocales) {
			expect(body).toContain(`Disallow: /${code}/auth/login`);
		}
		expect(body).toContain(
			"Sitemap: https://digital-buddhism.example/sitemap.xml",
		);
	});
});
