import { render } from "@testing-library/react";
import type { SegmentForDetail, TitleSegment } from "@/app/[locale]/types";
import { SegmentElement } from "./segment";

function makeListSegment(overrides: Partial<TitleSegment> = {}): TitleSegment {
	return {
		id: 1,
		contentId: 1,
		number: 1,
		text: "source",
		translationText: null,
		...overrides,
	};
}

function makeDetailSegment(
	overrides: Partial<SegmentForDetail> = {},
): SegmentForDetail {
	return {
		...makeListSegment(),
		segmentTypeKey: "Primary",
		segmentTypeLabel: "Primary",
		annotations: [],
		...overrides,
	} as SegmentForDetail;
}

describe("SegmentElement", () => {
	test("interactive=true かつ訳文があるとき、訳文ブロックに data-segment-id が付く", () => {
		const { container } = render(
			<SegmentElement
				interactive={true}
				segment={makeDetailSegment({
					id: 10,
					translationText: "translation",
				})}
			/>,
		);

		expect(container.querySelector("button")).toBeNull();
		const tr = container.querySelector(".seg-tr");
		expect(tr).not.toBeNull();
		expect(tr).toHaveAttribute("data-segment-id", "10");
		expect(tr).toHaveAttribute("role", "button");
		expect(tr).toHaveAttribute("tabindex", "0");
		expect(tr).toHaveTextContent("translation");
	});

	test("interactive=false のとき、訳文に data-segment-id は付かない", () => {
		const { container } = render(
			<SegmentElement
				interactive={false}
				segment={makeListSegment({
					translationText: "translation",
				})}
			/>,
		);

		expect(container.querySelector("button")).toBeNull();
		expect(
			container.querySelector(".seg-tr")?.getAttribute("data-segment-id"),
		).toBeNull();
		expect(container).toHaveTextContent("translation");
	});

	test("注釈を持つとき、注釈は data-annotation-type 付きで描画される", () => {
		const { container } = render(
			<SegmentElement
				interactive={true}
				segment={makeDetailSegment({
					annotations: [
						{
							annotationSegment: makeDetailSegment({
								id: 200,
								number: 200,
								text: "ann-src",
								segmentTypeKey: "Atthakatha",
								segmentTypeLabel: "Atthakatha",
								translationText: "ann-tr",
							}),
						},
					],
				})}
			/>,
		);

		expect(
			container.querySelector('[data-annotation-type="Atthakatha"].seg-ann'),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-annotation-type="Atthakatha"].seg-ann.seg-tr[role="button"]',
			),
		).not.toBeNull();
		expect(container).toHaveTextContent("ann-src");
		expect(container).toHaveTextContent("ann-tr");
	});
});
