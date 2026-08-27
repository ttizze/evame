import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("originのトップpageを使った仏典一覧", () => {
	it("仏典の旧URL一覧をoriginのPageList相当の行で表示する", () => {
		render(
			<HomePage
				items={[
					{
						id: "7",
						slug: "dhammapada-1",
						title: "Dhammapada 1",
						ownerHandle: "tipitaka",
						hierarchy: ["Khuddaka Nikāya", "Dhammapada"],
						translationCount: 2,
						href: "/en/tipitaka/dhammapada-1",
					},
				]}
				locale="en"
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "Read the Pāli canon" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Dhammapada 1/ })).toHaveAttribute(
			"href",
			"/en/tipitaka/dhammapada-1",
		);
		expect(screen.getAllByRole("article")[0]).toHaveClass("grid", "border-b");
		expect(
			screen.queryByText(/記事|投稿|コメント|いいね|More/),
		).not.toBeInTheDocument();
	});
});
