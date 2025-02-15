import { describe, expect, test } from "vitest";
import { collectBlocksFromRoot } from "../../../../../../../lib/process-html";
import { parseHtmlToAst } from "./process-page-comment-html";

describe("collectBlocksAndSegmentsFromRoot", () => {
	test("段落やブロック要素を解析し、pageCommentSegmentに正しく保存される", async () => {
		const commentHtml = `
      <p>First line</p>
      <p>Second line</p>
      <div>Third line</div>
      <section><h2>Nested heading</h2></section>
    `;

		const blocks = collectBlocksFromRoot(parseHtmlToAst(commentHtml));
		expect(blocks).toHaveLength(4);
		expect(blocks[0].text).toBe("First line");
		expect(blocks[1].text).toBe("Second line");
		expect(blocks[2].text).toBe("Third line");
		expect(blocks[3].text).toBe("Nested heading");
	});

	test("同じテキストが複数回出現する場合、オカレンスが分かれて保存される", async () => {
		const commentHtml = `
      <p>Repeat me</p>
      <p>Repeat me</p>
      <p>Another line</p>
      <p>Repeat me</p>
    `;

		const blocks = collectBlocksFromRoot(parseHtmlToAst(commentHtml));

		expect(blocks).toHaveLength(4);
		expect(blocks[0].text).toBe("Repeat me");
		expect(blocks[1].text).toBe("Repeat me");
		expect(blocks[2].text).toBe("Another line");
		expect(blocks[3].text).toBe("Repeat me");
		expect(blocks[0].textAndOccurrenceHash).not.toBe(
			blocks[1].textAndOccurrenceHash,
		);
	});
});
