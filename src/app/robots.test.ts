import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = {
	// Vitest v3 uses a single generic for the function type
	countPublicPages: vi.fn<() => Promise<number>>(),
};

vi.mock("@/app/_db/sitemap-queries.server", () => ({
	countPublicPages: () => mocks.countPublicPages(),
}));

describe("robots generator", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env.NEXT_PUBLIC_DOMAIN = "https://example.com";
		mocks.countPublicPages.mockReset();
	});

	it("lists correct /sitemap/sitemap/{id}.xml entries", async () => {
		mocks.countPublicPages.mockResolvedValueOnce(2500); // -> 3 chunks
		const robots = (await import("./robots")).default;
		const result = await robots();
		expect(result.sitemap).toEqual([
			"https://example.com/sitemap/sitemap/0.xml",
			"https://example.com/sitemap/sitemap/1.xml",
			"https://example.com/sitemap/sitemap/2.xml",
		]);
	});
});
