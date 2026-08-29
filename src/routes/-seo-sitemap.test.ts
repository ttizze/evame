import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { generateRobotsResponse } from "./-seo-robots";
import {
	generateSitemapEntries,
	generateSitemapResponse,
	getSitemapChunkCount,
} from "./-seo-sitemap";
import { generateSitemapIndexResponse } from "./-seo-sitemap-index";

await setupDbPerFile(import.meta.url);

describe("TanStack StartのSEOルート生成", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("公開ページがなくてもサイトマップを1チャンクにする", async () => {
		expect(await getSitemapChunkCount()).toBe(1);

		const robots = await generateRobotsResponse();
		expect(await robots.text()).toMatch(/\/sitemap\/sitemap\/0\.xml/);

		const index = await generateSitemapIndexResponse();
		expect(await index.text()).toMatch(/\/sitemap\/sitemap\/0\.xml/);
	});

	it("DRAFTページをチャンク数とサイトマップURLに含めない", async () => {
		const user = await createUser();
		await createPage({
			userId: user.id,
			slug: "draft",
			status: "DRAFT",
		});

		expect(await getSitemapChunkCount()).toBe(1);
		const entries = await generateSitemapEntries(0);
		expect(entries.some((entry) => entry.url.includes("/draft"))).toBe(false);
	});

	it("公開ページのURLとXMLレスポンスを生成する", async () => {
		const user = await createUser({ handle: "alice" });
		await createPage({
			userId: user.id,
			slug: "my-page",
			status: "PUBLIC",
			sourceLocale: "ja",
		});

		const entries = await generateSitemapEntries(0);
		const pageEntry = entries.find((entry) =>
			entry.url.includes("/alice/my-page"),
		);
		expect(pageEntry?.url).toMatch(/\/ja\/alice\/my-page$/);

		const response = await generateSitemapResponse(0);
		expect(response.headers.get("Content-Type")).toContain("application/xml");
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
		);
		expect(await response.text()).toContain("/ja/alice/my-page");
	});
});
