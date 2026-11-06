import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHomeFeed } from "./data";
import { getHomeMetadata } from "./metadata";

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("./data", () => ({ getHomeFeed: vi.fn() }));
vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));

vi.mock("@tanstack/react-router", () => ({
	ClientOnly: ({ children }: { children: ReactNode }) => <>{children}</>,
	Link: ({ children }: { children: ReactNode }) => (
		<a data-testid="more-link" href="/en/new-pages">
			{children}
		</a>
	),
}));

vi.mock("../about-section/presentation", () => ({
	default: ({
		floatingControls,
		stats,
	}: {
		floatingControls: ReactNode;
		stats: { articles: number } | null;
	}) => (
		<section
			data-articles={stats?.articles ?? "loading"}
			data-has-floating-controls={String(Boolean(floatingControls))}
			data-testid="about-section"
		>
			About
			{floatingControls}
		</section>
	),
}));

vi.mock("../floating-controls/floating-controls.client", () => ({
	FloatingControls: () => <div data-testid="floating-controls" />,
}));

vi.mock("../page/new-page-list/presentation", () => ({
	NewPageListPresentation: ({
		pageForLists,
	}: {
		pageForLists: { slug: string }[];
	}) => (
		<section data-testid="new-pages">
			New
			{pageForLists.map((page) => (
				<span key={page.slug}>{page.slug}</span>
			))}
		</section>
	),
}));

vi.mock("../page/popular-page-list/presentation", () => ({
	PopularPageListPresentation: () => (
		<section data-testid="popular-pages">Popular</section>
	),
}));

import { HomePresentation } from "./presentation";

const data = {
	pageDetail: {
		sourceLocale: "en",
		segments: [],
	},
};

beforeEach(() => {
	vi.mocked(getHomeFeed).mockImplementation(() => new Promise(() => {}));
});
function renderHome(element: ReactNode) {
	return render(
		<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
			{element}
		</SWRConfig>,
	);
}

describe("ホーム画面", () => {
	it("Tipitaka一覧を表示せず通常の記事一覧とMoreリンクを維持する", () => {
		const { container } = renderHome(
			<HomePresentation locale="en" pageDetail={data.pageDetail} />,
		);

		expect(
			[...container.querySelectorAll("[data-testid]")].map((element) =>
				element.getAttribute("data-testid"),
			),
		).toEqual([
			"about-section",
			"floating-controls",
			"new-pages",
			"more-link",
			"popular-pages",
		]);
		expect(screen.getByTestId("about-section")).toHaveAttribute(
			"data-has-floating-controls",
			"false",
		);
		expect(screen.getAllByTestId("floating-controls")).toHaveLength(1);
		expect(screen.getByRole("link", { name: /More/ })).toBeInTheDocument();
	});

	it("Aboutページがなくても一覧を表示しAboutSectionだけ省略する", () => {
		const { container } = renderHome(
			<HomePresentation locale="en" pageDetail={null} />,
		);

		expect(screen.queryByTestId("about-section")).not.toBeInTheDocument();
		expect(
			[...container.querySelectorAll("[data-testid]")].map((element) =>
				element.getAttribute("data-testid"),
			),
		).toEqual(["floating-controls", "new-pages", "more-link", "popular-pages"]);
		expect(screen.getByTestId("floating-controls")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /More/ })).toBeInTheDocument();
	});
});

it("静的HTMLの生成時には新着記事のServer Functionを呼ばない", () => {
	const html = renderToString(
		<SWRConfig value={{ provider: () => new Map() }}>
			<HomePresentation locale="ja" pageDetail={data.pageDetail} />
		</SWRConfig>,
	);
	expect(html).toContain("About");
	expect(getHomeFeed).not.toHaveBeenCalled();
});

it("説明文を先に表示し、取得できた新着記事と件数を後から反映する", async () => {
	const pending =
		Promise.withResolvers<Awaited<ReturnType<typeof getHomeFeed>>>();
	vi.mocked(getHomeFeed).mockReturnValue(pending.promise);
	const { container } = renderHome(
		<HomePresentation locale="ja" pageDetail={data.pageDetail} />,
	);
	expect(screen.getByTestId("about-section")).toHaveAttribute(
		"data-articles",
		"loading",
	);
	expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
	expect(getHomeFeed).toHaveBeenCalledWith({ data: "ja" });
	pending.resolve({
		stats: { articles: 1, translations: 2, languages: 18 },
		newPages: {
			totalPages: 1,
			pageForLists: [
				{
					id: 1,
					slug: "latest-article",
					createdAt: new Date(),
					status: "PUBLIC",
					userHandle: "author",
					userName: "Author",
					userImage: "",
					titleSegment: {
						id: 1,
						contentId: 1,
						number: 0,
						text: "Latest",
						translationText: null,
					},
					tags: [],
					likeCount: 0,
					pageCommentsCount: 0,
					viewCount: 0,
				},
			],
		},
		popularPages: { totalPages: 1, pageForLists: [] },
	});
	expect(await screen.findByText("latest-article")).toBeInTheDocument();
	expect(screen.getByTestId("about-section")).toHaveAttribute(
		"data-articles",
		"1",
	);
	await waitFor(() =>
		expect(
			container.querySelector('[aria-busy="true"]'),
		).not.toBeInTheDocument(),
	);
});

it("記事取得が失敗しても説明文を残し、再試行で一覧を更新できる", async () => {
	vi.mocked(getHomeFeed).mockRejectedValueOnce(new Error("offline"));
	renderHome(<HomePresentation locale="ja" pageDetail={data.pageDetail} />);
	expect(await screen.findByRole("alert")).toHaveTextContent("loadError");
	expect(screen.getByTestId("about-section")).toBeInTheDocument();
	vi.mocked(getHomeFeed).mockResolvedValue({
		stats: { articles: 0, translations: 0, languages: 18 },
		newPages: { totalPages: 0, pageForLists: [] },
		popularPages: { totalPages: 0, pageForLists: [] },
	});
	fireEvent.click(screen.getByRole("button", { name: "retry" }));
	await waitFor(() =>
		expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
	);
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
