import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import type { loadAboutPage } from "../service/load-about-page";

vi.mock(
	"@/app/[locale]/(common-layout)/_components/wrap-segments/segment",
	() => ({
		SegmentElement: ({
			segment,
		}: {
			segment: { text: string; number: number };
		}) => <span data-testid={`segment-${segment.number}`}>{segment.text}</span>,
	}),
);

import ComparisonSection from "./comparison-section";

function buildAboutPageDetail() {
	const entries: Array<[number, string]> = [
		[SEGMENT_NUMBER.comparisonHeader, "比較ヘッダー"],
		[SEGMENT_NUMBER.comparisonCol1, "Evame"],
		[SEGMENT_NUMBER.comparisonCol2, "Medium/note"],
		[SEGMENT_NUMBER.comparisonRow1Label, "届く読者の数"],
		[SEGMENT_NUMBER.comparisonRow1Evame, "世界中（18言語）"],
		[SEGMENT_NUMBER.comparisonRow1Others, "1言語圏のみ"],
		[SEGMENT_NUMBER.comparisonRow2Label, "翻訳品質"],
		[SEGMENT_NUMBER.comparisonRow2Evame, "読者の投票で改善"],
		[SEGMENT_NUMBER.comparisonRow2Others, "-"],
		[SEGMENT_NUMBER.comparisonRow3Label, "原文・訳文の表示"],
		[SEGMENT_NUMBER.comparisonRow3Evame, "並列表示に対応"],
		[SEGMENT_NUMBER.comparisonRow3Others, "単一言語のみ"],
	];

	return {
		segments: entries.map(([number, text], index) => ({
			id: index + 1,
			contentId: 1,
			number,
			text,
			translationText: null,
		})),
	} as NonNullable<Awaited<ReturnType<typeof loadAboutPage>>>;
}

describe("ComparisonSection", () => {
	it("モバイル向けに横スクロールできる最小幅のテーブルを持つ", () => {
		const view = ComparisonSection({
			pageDetail: buildAboutPageDetail(),
		});
		const { container } = render(view);

		const scrollArea = container.querySelector("div.overflow-x-auto");
		expect(scrollArea).not.toBeNull();

		const table = container.querySelector("table");
		expect(table).toHaveClass("min-w-[44rem]");
	});

	it("行見出しを左に固定して横スクロール中も項目名を保持する", () => {
		const view = ComparisonSection({
			pageDetail: buildAboutPageDetail(),
		});
		render(view);

		const rowHeader = screen.getByRole("rowheader", { name: "届く読者の数" });
		expect(rowHeader).toHaveClass("sticky");
		expect(rowHeader).toHaveClass("left-0");
	});
});
