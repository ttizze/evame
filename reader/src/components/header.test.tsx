import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HeaderIsland } from "./header";

vi.stubGlobal(
	"matchMedia",
	vi.fn(() => ({
		matches: false,
		addListener: vi.fn(),
		removeListener: vi.fn(),
	})),
);

vi.mock("@/app/[locale]/_components/analytics-consent.client", () => ({
	AnalyticsConsent: () => null,
}));
vi.mock(
	"@/app/[locale]/(common-layout)/_components/header/user-slot.client",
	() => ({
		HeaderUserSlot: () => <a href="/ja/auth/login">ログイン</a>,
	}),
);
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { useSession: () => ({ data: null }) },
}));
vi.mock(
	"@/app/[locale]/(common-layout)/_components/header/locale-selector/client",
	() => ({
		LocaleSelector: () => <button type="button">日本語</button>,
	}),
);

it("ブログでは所有者名からブログトップへ戻れ、共通ロゴとログインを表示しない", () => {
	render(
		<HeaderIsland
			blog={{ handle: "alice", name: "開発ノート", image: null }}
			gaTrackingId=""
			locale="ja"
			search=""
			showHeader
		/>,
	);
	const header = within(screen.getByRole("banner"));
	expect(
		header.getByRole("link", { name: "開発ノート" }).getAttribute("href"),
	).toBe("/ja/alice");
	expect(header.getByRole("link", { name: "記事" }).getAttribute("href")).toBe(
		"/ja/alice",
	);
	expect(header.queryByRole("link", { name: "ログイン" })).toBeNull();
	expect(header.queryByRole("img", { name: /Evame/ })).toBeNull();
});

it("共通トップではEvameのロゴとログインの入口を維持する", () => {
	render(
		<HeaderIsland
			blog={null}
			gaTrackingId=""
			locale="ja"
			search=""
			showHeader
		/>,
	);
	expect(screen.getByRole("link", { name: "ログイン" })).not.toBeNull();
	expect(
		screen.getAllByRole("img", { name: "Evame Logo" }).length,
	).toBeGreaterThan(0);
});
