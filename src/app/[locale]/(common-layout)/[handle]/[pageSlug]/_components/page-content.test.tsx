import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScriptureDetail } from "@/components/scripture/types";
import { PageContent } from "./page-content";

const detail: ScriptureDetail = {
	id: "7",
	slug: "dhammapada-1",
	title: "Dhammapada 1",
	ownerHandle: "tipitaka",
	sourceLocale: "pi",
	displayLocale: "en",
	hierarchy: ["Khuddaka Nikāya", "Dhammapada"],
	sourceText: "Mind precedes all things.",
	segments: [
		{
			id: "70",
			kind: "PRIMARY",
			position: 0,
			sourceText: "Mind precedes all things.",
			translations: [],
		},
	],
	translations: [],
	annotationLinks: [],
};

describe("originの詳細page-contentを使った仏典表示", () => {
	it("旧詳細の外側構造を保ち、記事操作を表示せず原文を表示する", () => {
		render(
			<PageContent
				authenticated={false}
				detail={detail}
				locale="en"
				onVote={vi.fn()}
			/>,
		);

		expect(screen.getByRole("article")).toHaveClass(
			"prose",
			"lg:prose-lg",
			"mx-auto",
			"mb-20",
		);
		expect(
			screen.getByRole("heading", { name: "Dhammapada 1" }),
		).toBeInTheDocument();
		expect(screen.getByText("Mind precedes all things.")).toHaveAttribute(
			"lang",
			"pi",
		);
		expect(
			screen.queryByText(/Comments|コメント|Like|いいね/),
		).not.toBeInTheDocument();
	});
});
