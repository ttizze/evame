import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { getHomeMetadata } from "./metadata";

vi.mock("@tanstack/react-router", () => ({
	ClientOnly: ({ children }: { children: ReactNode }) => <>{children}</>,
	Link: ({ children }: { children: ReactNode }) => (
		<a data-testid="more-link" href="/en/new-pages">
			{children}
		</a>
	),
}));

vi.mock("../about-section/presentation", () => ({
	default: () => <section data-testid="about-section">About</section>,
}));

vi.mock("../page/new-page-list/presentation", () => ({
	NewPageListPresentation: () => <section data-testid="new-pages">New</section>,
}));

vi.mock("../page/popular-page-list/presentation", () => ({
	PopularPageListPresentation: () => (
		<section data-testid="popular-pages">Popular</section>
	),
}));

vi.mock("../tipitaka-page-list/tipitaka-page-list", () => ({
	TipitakaPageList: () => (
		<section data-testid="tipitaka-pages">Tipiṭaka</section>
	),
}));

import { HomePresentation } from "./presentation";

const data: Parameters<typeof HomePresentation>[0]["data"] = {
	pageDetail: {
		id: 1,
		slug: "evame",
		title: "Evame",
		status: "PUBLIC",
		sourceLocale: "en",
		parentId: null,
		order: 0,
		mdastJson: null,
		segments: [],
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		userId: "user-id",
		userName: "Evame",
		userHandle: "evame",
		userImage: "",
		tagPages: [],
	},
	stats: { articles: 1, translations: 2, languages: 18 },
	newPages: { pageForLists: [], totalPages: 0 },
	popularPages: { pageForLists: [], totalPages: 0 },
	tipitakaPages: [],
};

describe("ホーム画面", () => {
	it("既存セクションを順番どおり表示しMoreリンクを維持する", () => {
		const { container } = render(<HomePresentation data={data} locale="en" />);

		expect(
			[...container.querySelectorAll("[data-testid]")].map((element) =>
				element.getAttribute("data-testid"),
			),
		).toEqual([
			"about-section",
			"new-pages",
			"more-link",
			"popular-pages",
			"tipitaka-pages",
		]);
		expect(screen.getByRole("link", { name: /More/ })).toBeInTheDocument();
	});
});

describe("ホーム画面のメタデータ", () => {
	it("ロケール別の文言とルートのcanonical alternateを返す", () => {
		const metadata = getHomeMetadata("ja");

		expect(metadata.title).toBe("Evame — 言葉の壁がないインターネット");
		expect(metadata.description).toContain("母国語で書く。世界が読む。");
		expect(metadata.alternates.canonical).toMatch(/\/ja$/);
		expect(metadata.alternates.languages["x-default"]).toMatch(/\/en$/);
	});
});
