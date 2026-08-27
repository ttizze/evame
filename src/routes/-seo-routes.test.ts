import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	db: {
		all: vi.fn(),
	},
}));

vi.mock("@/server/runtime", () => ({
	getDatabase: () => state.db,
}));

import { Route as RobotsRoute } from "./robots[.]txt";
import { Route as SitemapRoute } from "./sitemap[.]xml";

type Handler = (context: { request: Request }) => Promise<Response>;

function getHandler(route: unknown): Handler {
	const handlers = (
		route as {
			options: { server?: { handlers?: { GET?: Handler } } };
		}
	).options.server?.handlers;
	if (!handlers?.GET) throw new Error("GET handlerが見つかりません");
	return handlers.GET;
}

describe("SEO 用の公開 HTTP route", () => {
	it("公開済み仏典だけを sitemap に含める", async () => {
		state.db.all.mockResolvedValue([{ slug: "dhammapada" }]);

		const response = await getHandler(SitemapRoute)({
			request: new Request("https://digital-buddhism.example/sitemap.xml"),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/xml");
		expect(await response.text()).toContain(
			"https://digital-buddhism.example/ja/dhammapada",
		);
		expect(state.db.all).toHaveBeenCalledWith(
			expect.stringContaining("published_at IS NOT NULL"),
		);
	});

	it("robots.txt は API とログイン画面をクロール対象外にする", async () => {
		const response = await getHandler(RobotsRoute)({
			request: new Request("https://digital-buddhism.example/robots.txt"),
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe(
			"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /login\nSitemap: https://digital-buddhism.example/sitemap.xml\n",
		);
	});
});
