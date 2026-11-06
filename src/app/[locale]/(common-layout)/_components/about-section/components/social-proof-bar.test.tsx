import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import SocialProofBar from "./social-proof-bar";

vi.mock(
	"@/app/[locale]/(common-layout)/_components/wrap-segments/segment",
	() => ({
		SegmentElement: ({ segment }: { segment: { text: string } }) => (
			<span>{segment.text}</span>
		),
	}),
);
const pageDetail = {
	sourceLocale: "en",
	segments: [
		{ number: SEGMENT_NUMBER.socialProofArticles, text: "Articles" },
		{ number: SEGMENT_NUMBER.socialProofTranslations, text: "Translations" },
		{ number: SEGMENT_NUMBER.socialProofLanguages, text: "Languages" },
	].map((segment, index) => ({
		...segment,
		id: index + 1,
		contentId: 1,
		translationText: null,
	})),
};
it("Aboutページに記事数・翻訳数・言語数と説明のラベルを表示する", () => {
	render(
		<SocialProofBar
			locale="en"
			pageDetail={pageDetail}
			stats={{ articles: 1234, translations: 0, languages: 18 }}
		/>,
	);
	expect(screen.getByText("Articles")).toBeInTheDocument();
	expect(screen.getByText("1,234")).toBeInTheDocument();
	expect(screen.getByText("Translations")).toBeInTheDocument();
	expect(screen.getByText("0")).toBeInTheDocument();
	expect(screen.getByText("Languages")).toBeInTheDocument();
	expect(screen.getByText("18")).toBeInTheDocument();
});
