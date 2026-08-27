import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScriptureDetail } from "@/components/scripture/types";
import { ContentWithTranslations } from "./content-with-translations";

const detail: ScriptureDetail = {
	id: "7",
	slug: "dhammapada-1",
	title: "Dhammapada 1",
	ownerHandle: "tipitaka",
	sourceLocale: "pi",
	displayLocale: "en",
	hierarchy: ["Dhammapada 1"],
	sourceText: "Mind precedes all things.",
	segments: [
		{
			id: "70",
			kind: "PRIMARY",
			position: 0,
			sourceText: "Mind precedes all things.",
			translations: [
				{
					id: "700",
					locale: "en",
					text: "Mind comes before everything.",
					voteCount: 2,
					votedByViewer: null,
					userName: "Translator",
					userHandle: "translator",
					userProfile: "",
					userIsAi: false,
					userTotalPoints: 0,
					ownedByViewer: false,
				},
			],
		},
		{
			id: "71",
			kind: "COMMENTARY",
			position: 1,
			sourceText: "A commentary on the passage.",
			translations: [],
		},
	],
	translations: [],
	annotationLinks: [
		{
			mainSegmentId: "70",
			annotationSegmentId: "71",
			createdAt: "2026-01-01T00:00:00.000Z",
		},
	],
	availableLocales: [{ code: "en", label: "English" }],
};

describe("originのcontent-with-translationsを使った仏典詳細", () => {
	it("原文・翻訳候補・COMMENTARY・AI jobを表示し記事操作を持たない", () => {
		render(
			<ContentWithTranslations
				authenticated={true}
				createTranslationJob={vi.fn()}
				detail={detail}
				getTranslationJob={vi.fn()}
				locale="en"
				onVote={vi.fn()}
			/>,
		);

		expect(screen.getByText("Mind precedes all things.")).toHaveAttribute(
			"lang",
			"pi",
		);
		expect(
			screen.getByText("Mind comes before everything."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("complementary", { name: "Annotation" }),
		).toHaveTextContent("A commentary on the passage.");
		expect(
			screen.getByRole("heading", { name: "AI translation" }),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/Comments|Like|view count/i),
		).not.toBeInTheDocument();
	});
});
