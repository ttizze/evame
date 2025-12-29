import { render, screen } from "@testing-library/react";
import type { SegmentForList } from "@/app/[locale]/types";
import { WrapSegment } from "./server";

function makeSegment(overrides: Partial<SegmentForList> = {}): SegmentForList {
	return {
		id: 1,
		contentId: 1,
		number: 1,
		text: "source",
		textAndOccurrenceHash: "hash",
		createdAt: new Date(0),
		segmentTypeId: 1,
		segmentType: { key: "primary", label: "Primary" },
		segmentTranslation: null,
		...overrides,
	};
}

describe("WrapSegment (rehype-react adapter)", () => {
	test("data-number-id が一致すると SegmentElement 経由で描画され、children が本文に使われる", () => {
		const P = WrapSegment(
			"p",
			[makeSegment({ number: 10, text: "ignored" })],
			true,
		);
		const { container } = render(
			<P data-number-id={10}>
				<strong>child</strong>
			</P>,
		);

		const segSrc = container.querySelector(".seg-src");
		expect(segSrc).not.toBeNull();
		expect(segSrc).toHaveTextContent("child");
		expect(segSrc).not.toHaveTextContent("ignored");

		// SegmentElement 側が data-number-id を残すこと（クリックUI等の参照キー）
		expect(container.querySelector('[data-number-id="10"]')).not.toBeNull();
	});

	test("data-number-id が無い/一致しない場合は素通しで DOM 要素を返す", () => {
		const P = WrapSegment("p", [makeSegment({ number: 10 })], true);
		const { container } = render(
			<>
				<P className="raw">a</P>
				<P className="raw" data-number-id={999}>
					b
				</P>
			</>,
		);

		expect(container.querySelectorAll(".seg-src")).toHaveLength(0);
		expect(screen.getByText("a").className).toContain("raw");
		expect(screen.getByText("b").className).toContain("raw");
	});
});
