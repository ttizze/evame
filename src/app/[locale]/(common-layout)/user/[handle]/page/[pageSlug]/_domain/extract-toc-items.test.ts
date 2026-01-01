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
		number,
		text,
		segmentTranslation: translatedText ? { text: translatedText } : null,
	}) as SegmentForDetail;

describe("extractTocItems", () => {
	it("深さ1-3の見出しだけを順序通りに抽出する", () => {
		const slugger = new GithubSlugger();
		const mdast = root([
			headingNode(1, 1),
			headingNode(2, 2),
			headingNode(3, 4),
		]);
		const segments = [
			createSegment(1, "Heading 1"),
			createSegment(2, "Heading 2"),
			createSegment(3, "Heading 3"),
		];

		const result = extractTocItems({ mdast, segments });

		expect(result).toEqual([
			{
				id: slugger.slug("Heading 1"),
				depth: 1,
				sourceText: "Heading 1",
				translatedText: null,
			},
			{
				id: slugger.slug("Heading 2"),
				depth: 2,
				sourceText: "Heading 2",
				translatedText: null,
			},
		]);
	});

	it("翻訳が元文と同一なら translatedText は null になる", () => {
		const slugger = new GithubSlugger();
		const mdast = root([headingNode(1, 1), headingNode(2, 2)]);
		const segments = [
			createSegment(1, "Same Title", "Same Title"),
			createSegment(2, "Source Title", "Translated Title"),
		];

		const result = extractTocItems({ mdast, segments });

		expect(result).toEqual([
			{
				id: slugger.slug("Same Title"),
				depth: 1,
				sourceText: "Same Title",
				translatedText: null,
			},
			{
				id: slugger.slug("Source Title"),
				depth: 2,
				sourceText: "Source Title",
				translatedText: "Translated Title",
			},
		]);
	});

	it("空白差分だけの訳文は translatedText を出さない", () => {
		const slugger = new GithubSlugger();
		const mdast = root([headingNode(1, 1)]);
		const segments = [createSegment(1, "Same  Title", "Same Title")];

		const result = extractTocItems({ mdast, segments });

		expect(result).toEqual([
			{
				id: slugger.slug("Same  Title"),
				depth: 1,
				sourceText: "Same  Title",
				translatedText: null,
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
