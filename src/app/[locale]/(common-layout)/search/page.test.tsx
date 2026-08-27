import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SearchPage from "./page";

describe("仏典検索ページ", () => {
	it("検索フォームと題名・原文の切り替えを表示する", () => {
		render(<SearchPage category="title" locale="ja" query="" results={[]} />);

		expect(
			screen.getByRole("heading", { name: "仏典を検索" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "題名" })).toHaveAttribute(
			"href",
			"/ja/search?category=title",
		);
		expect(screen.getByRole("link", { name: "原文" })).toHaveAttribute(
			"href",
			"/ja/search?category=content",
		);
	});

	it("一致結果を旧仏典URLでリンクする", () => {
		render(
			<SearchPage
				category="content"
				locale="en"
				query="dhamma"
				results={[
					{
						id: "1",
						slug: "dhammapada",
						title: "Dhammapada",
						ownerHandle: "tipitaka",
						paliTitle: "Dhammapada",
						hierarchy: ["Khuddaka Nikāya", "Dhammapada"],
						translationCount: 2,
						href: "/en/tipitaka/dhammapada",
					},
				]}
			/>,
		);

		expect(screen.getByRole("link", { name: "Dhammapada" })).toHaveAttribute(
			"href",
			"/en/tipitaka/dhammapada",
		);
	});
});
