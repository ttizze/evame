import GithubSlugger from "github-slugger";
import { describe, expect, it } from "vitest";
import type { SegmentForDetail } from "@/app/[locale]/types";
import type { JsonValue } from "@/db/types";
import { extractTocItems } from "./extract-toc-items";

const headingNode = (number: number | null, depth: number): JsonValue => ({
	type: "heading",
	depth,
	data:
		number !== null
			? { hProperties: { "data-number-id": number.toString() } }
			: undefined,
	children: [{ type: "text", value: `Heading ${number ?? "?"}` }],
});

const root = (children: JsonValue[]): JsonValue => ({
	type: "root",
	children,
});

const createSegment = (
	number: number,
	text: string,
	translatedText: string | null = null,
): SegmentForDetail =>
	({
		id: number,
		contentId: 1,
		number,
		text,
		translationText: translatedText,
		segmentTypeKey: "Primary",
		segmentTypeLabel: "Primary",
		annotations: [],
	}) as SegmentForDetail;

describe("extractTocItems", () => {
	it("深さ1-4の見出しだけを順序通りに抽出する", () => {
		const slugger = new GithubSlugger();
		const mdast = root([
			headingNode(1, 1),
			headingNode(2, 2),
			headingNode(3, 4),
			headingNode(4, 5),
		]);
		const segments = [
			createSegment(1, "Heading 1"),
			createSegment(2, "Heading 2"),
			createSegment(3, "Heading 3"),
			createSegment(4, "Heading 4"),
		];

		const result = extractTocItems({ mdast, segments });

		expect(result).toEqual([
			{
				anchorId: slugger.slug("Heading 1"),
				level: 1,
				segment: {
					id: 1,
					contentId: 1,
					number: 1,
					text: "Heading 1",
					translationText: null,
				},
			},
			{
				anchorId: slugger.slug("Heading 2"),
				level: 2,
				segment: {
					id: 2,
					contentId: 1,
					number: 2,
					text: "Heading 2",
					translationText: null,
				},
			},
			{
				anchorId: slugger.slug("Heading 3"),
				level: 4,
				segment: {
					id: 3,
					contentId: 1,
					number: 3,
					text: "Heading 3",
					translationText: null,
				},
			},
		]);
	});

	it("data-number-idが欠ける/未登録の見出しは無視する", () => {
		const mdast = root([headingNode(null, 1), headingNode(9, 2)]);
		const segments = [createSegment(1, "Heading 1")];

		const result = extractTocItems({ mdast, segments });

		expect(result).toEqual([]);
	});

	it("空文字の見出しテキストは無視する", () => {
		const mdast = root([headingNode(1, 1)]);
		const segments = [createSegment(1, "   ")];

		const result = extractTocItems({ mdast, segments });

		expect(result).toEqual([]);
	});
});
