import { render, screen } from "@testing-library/react";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";
import { SegmentElement } from "./segment";

type SegmentTranslation = NonNullable<SegmentForList["segmentTranslation"]>;

function makeTranslation(
	overrides: Partial<SegmentTranslation> = {},
): SegmentTranslation {
	return {
		id: 99,
		segmentId: 1,
		userId: "u1",
		locale: "ja",
		text: "translation",
		point: 0,
		createdAt: new Date(0),
		user: {
			id: "u1",
			name: "User",
			handle: "user",
			image: "",
			createdAt: new Date(0),
			updatedAt: new Date(0),
			profile: "",
			twitterHandle: "",
			totalPoints: 0,
			isAi: false,
			plan: "",
		},
		...overrides,
	};
}

function makeListSegment(
	overrides: Partial<SegmentForList> = {},
): SegmentForList {
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

function makeDetailSegment(
	overrides: Partial<SegmentForDetail> = {},
): SegmentForDetail {
	return {
		...makeListSegment(),
		annotations: [],
		...overrides,
	} as SegmentForDetail;
}

describe("SegmentElement", () => {
	test("interactive=true かつ訳文があるとき、訳文は data-segment-id 付きの button になる", () => {
		render(
			<SegmentElement
				interactive={true}
				segment={makeListSegment({
					id: 10,
					segmentTranslation: makeTranslation({ id: 99, segmentId: 10 }),
				})}
			/>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("data-segment-id", "10");
		expect(button).toHaveAttribute("data-best-translation-id", "99");
		expect(button).toHaveTextContent("translation");
	});

	test("interactive=false のとき、訳文は button ではなくテキストとして描画される", () => {
		const { container } = render(
			<SegmentElement
				interactive={false}
				segment={makeListSegment({
					segmentTranslation: makeTranslation({ id: 99 }),
				})}
			/>,
		);

		expect(container.querySelector("button")).toBeNull();
		expect(container).toHaveTextContent("translation");
	});

	test("注釈を持つとき、注釈は data-annotation-type 付きで描画される", () => {
		const { container } = render(
			<SegmentElement
				interactive={true}
				segment={makeDetailSegment({
					annotations: [
						{
							annotationSegment: makeListSegment({
								id: 200,
								number: 200,
								text: "ann-src",
								segmentType: { key: "atthakatha", label: "Atthakatha" },
								segmentTranslation: makeTranslation({
									id: 201,
									segmentId: 200,
									text: "ann-tr",
								}),
							}),
						},
					],
				})}
			/>,
		);

		expect(
			container.querySelector('[data-annotation-type="Atthakatha"].seg-ann'),
		).not.toBeNull();
		expect(container).toHaveTextContent("ann-src");
		expect(container).toHaveTextContent("ann-tr");
	});
});
