import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ArticleActionsIsland, ArticleToolsFrame } from "./article-tools";

const article = {
	locale: "ja",
	search: "",
	handle: "alice",
	slug: "notes",
	createdAt: new Date("2025-01-01T23:30:00-08:00"),
};

afterEach(cleanup);

it("著者アイコンと名前を表示せず、代わりにUTCの日付を大きく表示する", () => {
	const { container } = render(
		<ArticleToolsFrame
			actions={null}
			createdAt={article.createdAt}
			locale={article.locale}
		/>,
	);
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

it.each([
	["ja", "2025/1/2"],
	["en", "1/2/2025"],
	["es", "2/1/2025"],
	["ko", "2025. 1. 2."],
	["zh", "2025/1/2"],
])("%sでもタイムゾーンを変えず日付を表示する", (locale, date) => {
	render(
		<ArticleToolsFrame
			actions={null}
			createdAt={article.createdAt}
			locale={locale}
		/>,
	);
	expect(screen.getByText(date).getAttribute("datetime")).toBe(
		"2025-01-02T07:30:00.000Z",
	);
});

it("Markdownのダウンロード先を維持する", () => {
	render(
		<ArticleActionsIsland
			handle={article.handle}
			locale={article.locale}
			search={article.search}
			slug={article.slug}
		/>,
	);
	expect(
		screen
			.getByRole("link", { name: "Markdownをダウンロード" })
			.getAttribute("href"),
	).toBe("/api/page-markdown?locale=ja&handle=alice&slug=notes");
});
