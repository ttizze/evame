import { describe, expect, it } from "vitest";
import { getRouter } from "./router";

const router = getRouter();

function expectRouteToMatch(pathname: string, routeId: string) {
	const matchedRouteIds = router
		.matchRoutes(pathname)
		.map((match) => match.routeId);

	expect(matchedRouteIds).toContain(routeId);
}

describe("TanStack StartのAPIルート登録", () => {
	it("/api/locale-info が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/locale-info", "/api/locale-info");
	});

	it("/api/page-likes/state が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/page-likes/state", "/api/page-likes/state");
	});

	it("/api/page-views/example-page-id/increment が実際のルートツリーでマッチする", () => {
		expectRouteToMatch(
			"/api/page-views/example-page-id/increment",
			"/api/page-views/$pageId/increment",
		);
	});

	it("/api/og が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/og", "/api/og");
	});

	it("/api/translate が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/translate", "/api/translate");
	});

	it("/api/translate/chunk が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/translate/chunk", "/api/translate/chunk");
	});

	it("/api/sync/push が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/sync/push", "/api/sync/push");
	});

	it("/api/sync/pull が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/sync/pull", "/api/sync/pull");
	});

	it("/api/sync/cli-login が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/sync/cli-login", "/api/sync/cli-login");
	});
});

describe("TanStack Startの互換ルート登録", () => {
	it("/auth/login がCLIログイン用にマッチする", () => {
		expectRouteToMatch("/auth/login", "/auth/login");
	});
});

describe("復元した画面ルートの登録", () => {
	it("/en が共通レイアウトのホーム画面へマッチする", () => {
		expectRouteToMatch("/en", "/$locale/_common/");
	});

	it("/en/example/page-management がページ管理画面へマッチする", () => {
		expectRouteToMatch(
			"/en/example/page-management",
			"/$locale/_common/$handle/page-management",
		);
	});

	it("/en/example/draft/edit が編集専用レイアウトへマッチする", () => {
		expectRouteToMatch(
			"/en/example/draft/edit",
			"/$locale/_edit/$handle/$pageSlug/edit",
		);
	});
});
