import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArticleToolsIsland } from "./article-tools";

const scroll = vi.hoisted(() => ({ isPinned: false }));

vi.mock(
	"@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll",
	() => ({
		useHeaderScroll: () => ({
			headerRef: { current: null },
			isPinned: scroll.isPinned,
			isVisible: true,
			headerHeight: 72,
		}),
	}),
);

const article = {
	locale: "ja",
	search: "",
	handle: "alice",
	slug: "notes",
	name: "著者の名前",
	image: null,
	createdAt: new Date("2025-01-01T23:30:00-08:00"),
	tocItems: [
		{
			anchorId: "heading",
			level: 2,
			segment: {
				id: 1,
				contentId: 1,
				number: 1,
				text: "記事の見出し",
				translationText: null,
			},
		},
	],
};

beforeEach(() => {
	scroll.isPinned = false;
});
afterEach(cleanup);

it("著者アイコンと名前を表示せず、代わりにUTCの日付を大きく表示する", () => {
	const { container } = render(<ArticleToolsIsland {...article} />);
	const date = screen.getByText("2025/1/2");
	expect(date.tagName).toBe("TIME");
	expect(date.getAttribute("datetime")).toBe("2025-01-02T07:30:00.000Z");
	expect(Array.from(date.classList)).toEqual(
		expect.arrayContaining(["text-base", "md:text-lg"]),
	);
	expect(date.closest("a")).toBeNull();
	expect(screen.queryByText("著者の名前")).toBeNull();
	expect(container.querySelector('[data-slot="avatar"]')).toBeNull();
});

it("上スクロールで固定したサブヘッダーにも著者ではなく日付を表示する", () => {
	scroll.isPinned = true;
	const { container } = render(<ArticleToolsIsland {...article} />);
	expect(screen.getByText("2025/1/2").tagName).toBe("TIME");
	expect(screen.queryByText("著者の名前")).toBeNull();
	expect(
		container
			.querySelector("[data-article-header] > div")
			?.classList.contains("fixed"),
	).toBe(true);
});

it.each([
	["ja", "2025/1/2"],
	["en", "1/2/2025"],
	["es", "2/1/2025"],
	["ko", "2025. 1. 2."],
	["zh", "2025/1/2"],
])("%sでもタイムゾーンを変えず日付を表示する", (locale, date) => {
	render(<ArticleToolsIsland {...article} locale={locale} />);
	expect(screen.getByText(date).getAttribute("datetime")).toBe(
		"2025-01-02T07:30:00.000Z",
	);
});

it("Markdownのダウンロードと目次の開閉を維持する", () => {
	render(<ArticleToolsIsland {...article} />);
	expect(
		screen
			.getByRole("link", { name: "Markdownをダウンロード" })
			.getAttribute("href"),
	).toBe("/api/page-markdown?locale=ja&handle=alice&slug=notes");
	fireEvent.click(screen.getByRole("button", { name: "Table of Contents" }));
	expect(
		screen.getByRole("link", { name: "記事の見出し" }).getAttribute("href"),
	).toBe("#heading");
	fireEvent.click(screen.getByRole("button", { name: "Table of Contents" }));
	expect(screen.queryByRole("link", { name: "記事の見出し" })).toBeNull();
});
