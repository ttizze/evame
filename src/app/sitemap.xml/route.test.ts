import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = {
  countPublicPages: vi.fn<[], Promise<number>>(),
};

vi.mock("@/app/_db/sitemap-queries.server", () => ({
  countPublicPages: () => mocks.countPublicPages(),
}));

describe("/sitemap.xml route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DOMAIN = "https://example.com";
    mocks.countPublicPages.mockReset();
  });

  it("emits at least one sitemap when total=0", async () => {
    mocks.countPublicPages.mockResolvedValueOnce(0);
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain(
      "https://example.com/sitemap/sitemap/0.xml",
    );
  });
});

