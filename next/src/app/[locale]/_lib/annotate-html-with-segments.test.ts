import { describe, expect, it } from "vitest";
import { annotateHtmlWithSegments } from "./annotate-html-with-segments";
import type { SegmentDraft } from "./remark-hash-and-segments";

describe("annotateHtmlWithSegments", () => {
	it("should convert HTML to annotated HTML with segments", async () => {
		const html = "<p>Paragraph 1</p><p>Paragraph 2</p>";
		const result = await annotateHtmlWithSegments({ html });

		// Check that we get the right structure back
		expect(result).toHaveProperty("annotatedHtml");
		expect(result).toHaveProperty("segments");

		// Check that the segments are properly created
		expect(result.segments).toHaveLength(2);
		expect(result.segments[0]).toMatchObject({
			number: 1,
			text: "Paragraph 1",
			hash: expect.any(String),
		});
		expect(result.segments[1]).toMatchObject({
			number: 2,
			text: "Paragraph 2",
			hash: expect.any(String),
		});

		// Verify that the annotated HTML contains data-number-id attributes
		expect(result.annotatedHtml).toContain('data-number-id="1"');
		expect(result.annotatedHtml).toContain('data-number-id="2"');
	});

	it("should include header as segment 0 when provided", async () => {
		const header = "Document Title";
		const html = "<p>Paragraph Content</p>";
		const result = await annotateHtmlWithSegments({ header, html });

		expect(result.segments).toHaveLength(2);
		expect(result.segments[0]).toMatchObject({
			number: 0,
			text: "Document Title",
			hash: expect.any(String),
		});
		expect(result.segments[1]).toMatchObject({
			number: 1,
			text: "Paragraph Content",
			hash: expect.any(String),
		});
	});

	it("should handle empty HTML", async () => {
		const result = await annotateHtmlWithSegments({ html: "" });

		expect(result.segments).toHaveLength(0);
		expect(result.annotatedHtml).toBe("");
	});

	it("should handle HTML with different block elements", async () => {
		const html = `
      <h1>Heading</h1>
      <p>Paragraph</p>
      <blockquote>Quote</blockquote>
      <ul><li>List item</li></ul>
      <table><tr><td>Table cell</td></tr></table>
    `;

		const result = await annotateHtmlWithSegments({ html });

		expect(result.segments.length).toBeGreaterThan(0);

		// Verify all expected text is present in segments
		const segmentTexts = result.segments.map(
			(segment: SegmentDraft) => segment.text,
		);
		expect(segmentTexts).toContain("Heading");
		expect(segmentTexts).toContain("Paragraph");
		expect(segmentTexts).toContain("Quote");
		expect(segmentTexts).toContain("List item");
		expect(segmentTexts).toContain("Table cell");
	});

	it("should sanitize HTML input", async () => {
		const html = '<p>Safe text</p><script>alert("XSS attack")</script>';
		const result = await annotateHtmlWithSegments({ html });

		// The script tag should be removed in sanitization
		expect(result.annotatedHtml).not.toContain("<script>");
		expect(result.annotatedHtml).not.toContain("XSS attack");

		// But the safe text should remain
		const segmentTexts = result.segments.map(
			(segment: SegmentDraft) => segment.text,
		);
		expect(segmentTexts).toContain("Safe text");
	});

	it("should handle same text appearing multiple times with different hashes", async () => {
		const html = "<p>Duplicate text</p><p>Duplicate text</p>";
		const result = await annotateHtmlWithSegments({ html });

		expect(result.segments).toHaveLength(2);
		expect(result.segments[0].text).toBe("Duplicate text");
		expect(result.segments[1].text).toBe("Duplicate text");

		// Hashes should be different even though the text is the same
		expect(result.segments[0].hash).not.toBe(result.segments[1].hash);
	});

	it("should preserve common Markdown-compatible HTML tags", async () => {
		const html = `
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <p>Normal paragraph with <strong>bold</strong> and <em>italic</em> text</p>
      <p>Paragraph with <a href="https://example.com">link</a> and <code>inline code</code></p>
      <pre><code>Code block
  with multiple lines</code></pre>
      <blockquote>
        <p>Blockquote text</p>
      </blockquote>
      <ul>
        <li>Unordered list item 1</li>
        <li>Unordered list item 2</li>
      </ul>
      <ol>
        <li>Ordered list item 1</li>
        <li>Ordered list item 2</li>
      </ol>
      <p>Paragraph with <img src="/test.jpg" alt="Test image" /> embedded image</p>
      <hr>
      <p>Paragraph after horizontal rule</p>
    `;

		const result = await annotateHtmlWithSegments({ html });
		// Check that Markdown-compatible tags are preserved
		expect(result.annotatedHtml).toContain("<h1");
		expect(result.annotatedHtml).toContain("<h2");
		expect(result.annotatedHtml).toContain("<strong>");
		expect(result.annotatedHtml).toContain("<em>");
		expect(result.annotatedHtml).toContain('<a href="https://example.com">');
		expect(result.annotatedHtml).toContain("<code>");
		expect(result.annotatedHtml).toContain("<pre><code>");
		expect(result.annotatedHtml).toContain("<blockquote>");
		expect(result.annotatedHtml).toContain("<ul>");
		expect(result.annotatedHtml).toContain("<ol>");
		expect(result.annotatedHtml).toContain("<li>");
		expect(result.annotatedHtml).toContain(
			'<img src="/test.jpg" alt="Test image"',
		);
		expect(result.annotatedHtml).toContain("<hr");

		// Verify segments contain the correct text with formatting stripped
		const segmentTexts = result.segments.map(
			(segment: SegmentDraft) => segment.text,
		);
		expect(segmentTexts).toContain("Heading 1");
		expect(segmentTexts).toContain("Heading 2");
		expect(segmentTexts).toContain(
			"Normal paragraph with bold and italic text",
		);
		expect(segmentTexts).toContain("Paragraph with link and inline code");
		expect(segmentTexts).toContain("Blockquote text");
		expect(segmentTexts).toContain("Unordered list item 1");
		expect(segmentTexts).toContain("Unordered list item 2");
		expect(segmentTexts).toContain("Ordered list item 1");
		expect(segmentTexts).toContain("Ordered list item 2");
		//画像の場合altも保存される
		expect(segmentTexts).toContain("Paragraph with Test image embedded image");
		expect(segmentTexts).toContain("Paragraph after horizontal rule");
	});
});
