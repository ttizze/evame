import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageWithUserAndTranslation } from "@/app/_db/sitemap-queries.server";

// Mocks that can be changed per-test
const mocks = {
	countPublicPages: vi.fn<() => Promise<number>>(),
	fetchPagesWithUserAndTranslationChunk:
		vi.fn<
			(args: {
				limit: number;
				offset: number;
			}) => Promise<PageWithUserAndTranslation[]>
		>(),
};

vi.mock("@/app/_db/sitemap-queries.server", () => ({
	countPublicPages: () => mocks.countPublicPages(),
	fetchPagesWithUserAndTranslationChunk: (args: {
		limit: number;
		offset: number;
	}) => mocks.fetchPagesWithUserAndTranslationChunk(args),
}));

describe("sitemap split & entries", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env.NEXT_PUBLIC_DOMAIN = "https://example.com";
		mocks.countPublicPages.mockReset();
		mocks.fetchPagesWithUserAndTranslationChunk.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("generateSitemaps returns at least 1 chunk when total=0", async () => {
		mocks.countPublicPages.mockResolvedValueOnce(0);
		const { generateSitemaps } = await import("./sitemap");
		const chunks = await generateSitemaps();
		expect(chunks).toEqual([{ id: 0 }]);
	});

	it("generateSitemaps splits count by 1000", async () => {
		mocks.countPublicPages.mockResolvedValueOnce(2500);
		const { generateSitemaps } = await import("./sitemap");
		const chunks = await generateSitemaps();
		expect(chunks.map((c) => c.id)).toEqual([0, 1, 2]);
	});

	it("sitemap(id=0) contains dynamic page with valid alternates.languages", async () => {
		mocks.countPublicPages.mockResolvedValue(1);
		mocks.fetchPagesWithUserAndTranslationChunk.mockResolvedValueOnce([
			{
				slug: "p1",
				updatedAt: new Date("2025-01-01T00:00:00Z"),
				sourceLocale: "ja",
				user: { handle: "alice" },
				translationJobs: [{ locale: "en" }, { locale: "zh" }],
			},
		]);

		const mod = await import("./sitemap");
		const entries = await mod.default({ id: 0 });

		const dynamic = entries.find(
			(e) => e.url === "https://example.com/ja/user/alice/page/p1",
		);
		expect(dynamic).toBeTruthy();
		expect(dynamic?.alternates?.languages).toBeTruthy();

		const langs = dynamic?.alternates?.languages as Record<string, string>;
		expect(langs.en).toBe("https://example.com/en/user/alice/page/p1");
		expect(langs.zh).toBe("https://example.com/zh/user/alice/page/p1");
		// Ensure values are strings (no accidental [object Object])
		expect(typeof langs.en).toBe("string");
		expect(typeof langs.zh).toBe("string");
	});
});
