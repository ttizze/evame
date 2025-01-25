import { describe, expect, test } from "vitest";
import { parseHtmlToAst } from "../comment/lib/process-comment-html";
import { collectBlocksAndSegmentsFromRoot } from "./process-html";

describe("collectBlocksAndSegmentsFromRoot", () => {
	test("段落やブロック要素を解析し、pageCommentSegmentに正しく保存される", async () => {
		const commentHtml = `
      <p>First line</p>
      <p>Second line</p>
      <div>Third line</div>
      <section><h2>Nested heading</h2></section>
    `;

		const { segments } = collectBlocksAndSegmentsFromRoot(
			parseHtmlToAst(commentHtml),
		);
		expect(segments).toHaveLength(4);
		expect(segments[0].text).toBe("First line");
		expect(segments[1].text).toBe("Second line");
		expect(segments[2].text).toBe("Third line");
		expect(segments[3].text).toBe("Nested heading");
	});

	test("同じテキストが複数回出現する場合、オカレンスが分かれて保存される", async () => {
		const commentHtml = `
      <p>Repeat me</p>
      <p>Repeat me</p>
      <p>Another line</p>
      <p>Repeat me</p>
    `;

		const { segments } = collectBlocksAndSegmentsFromRoot(
			parseHtmlToAst(commentHtml),
		);

		expect(segments).toHaveLength(4);
		expect(segments[0].text).toBe("Repeat me");
		expect(segments[1].text).toBe("Repeat me");
		expect(segments[2].text).toBe("Another line");
		expect(segments[3].text).toBe("Repeat me");
		expect(segments[0].textAndOccurrenceHash).not.toBe(
			segments[1].textAndOccurrenceHash,
		);
	});
});
