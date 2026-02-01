import { describe, expect, it } from "vitest";
import { markdownToMdastWithSegments } from "./markdown-to-mdast-with-segments";

describe("markdownToMdastWithSegments", () => {
	it("GFM記法を含むMarkdownをMDASTとセグメントに変換できる", async () => {
		const markdown = `
# Title

- [ ] Task one
- [x] Task two

| a | b |
| - | - |
| c | d |

Autolink: https://example.com

~~strikethrough~~

A note[^1]

[^1]: Footnote text.
`;

		const result = await markdownToMdastWithSegments({
			header: "Header",
			markdown,
		});

		const segmentTexts = result.segments.map((segment) => segment.text);
		expect(segmentTexts).toContain("Header");
		expect(segmentTexts).toContain("Title");
		expect(segmentTexts).toContain("Task one");
		expect(segmentTexts).toContain("Task two");
		expect(segmentTexts).toContain("a");
		expect(segmentTexts).toContain("b");
		expect(segmentTexts).toContain("c");
		expect(segmentTexts).toContain("d");
		expect(segmentTexts).toContain("Autolink: https://example.com");
		expect(segmentTexts).toContain("strikethrough");
		expect(segmentTexts).toContain("A note");
		expect(segmentTexts).toContain("Footnote text.");

		const mdastString = JSON.stringify(result.mdastJson);
		expect(mdastString).toContain('"table"');
		expect(mdastString).toContain('"listItem"');
		expect(mdastString).toContain('"footnoteDefinition"');
	});
});
