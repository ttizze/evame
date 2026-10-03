import { render } from "@testing-library/react";
import type { Segment } from "@/app/[locale]/types";
import { SegmentElement } from "./segment";

function makeListSegment(overrides: Partial<Segment> = {}): Segment {
	return {
		id: 1,
		contentId: 1,
		number: 1,
		text: "source",
		translationText: null,
		...overrides,
	};
}

describe("SegmentElement", () => {
	test("interactive=true かつ訳文があるとき、訳文ブロックに data-segment-id が付く", () => {
		const { container } = render(
			<SegmentElement
				interactive={true}
				segment={makeListSegment({
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
});
