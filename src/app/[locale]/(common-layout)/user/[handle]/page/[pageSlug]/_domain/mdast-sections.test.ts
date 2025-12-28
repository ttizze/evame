import { describe, expect, test } from "vitest";
import type { JsonValue } from "@/db/types";
import {
	collectSegmentNumbersFromMdast,
	sliceMdastSection,
	sliceMdastSectionGroup,
} from "./mdast-sections";

function mdast(children: unknown[]): JsonValue {
	return { type: "root", children } as unknown as JsonValue;
}

describe("mdast-sections", () => {
	test("depth=3 heading で分割する（しきい値判定はここではしない）", () => {
		const input = mdast([
			{ type: "paragraph", data: { hProperties: { "data-number-id": 0 } } },
			{ type: "heading", depth: 3 },
			{ type: "paragraph", data: { hProperties: { "data-number-id": 1 } } },
		]);

		const sliced = sliceMdastSection(input, 0);
		expect(sliced.totalSections).toBe(2);
		const root = sliced.mdast as unknown as { children: unknown[] };
		expect(root.children).toHaveLength(1);
	});

	test("section をグループ化して 1/3 ずつ返す", () => {
		const input = mdast([
			{ type: "paragraph" },
			{ type: "heading", depth: 3 },
			{ type: "paragraph" },
			{ type: "heading", depth: 3 },
			{ type: "paragraph" },
			{ type: "heading", depth: 3 },
			{ type: "paragraph" },
		]);

		const sliced = sliceMdastSectionGroup(input, 0, 3);
		expect(sliced.totalSections).toBe(2);
		const root = sliced.mdast as unknown as { children: unknown[] };
		expect(root.children).toHaveLength(3);
	});

	test("collectSegmentNumbersFromMdast は data-number-id を集める", () => {
		const input = mdast([
			{
				type: "paragraph",
				data: { hProperties: { "data-number-id": "2" } },
				children: [{ type: "text", value: "x" }],
			},
			{
				type: "heading",
				depth: 3,
				data: { hProperties: { "data-number-id": 1 } },
			},
		]);
		expect(collectSegmentNumbersFromMdast(input)).toEqual([1, 2]);
	});
});
