import { describe, expect, it } from "vitest";
import { htmlToMdastWithSegments } from "./html-to-mdast-with-segments";

describe("htmlToMdastWithSegments", () => {
	it("should convert simple HTML to MDAST with segments", async () => {
		const html = "<p>Hello World</p>";
		const result = await htmlToMdastWithSegments({ html });

		// Check structure of the result
		expect(result).toHaveProperty("mdastJson");
		expect(result).toHaveProperty("segments");
		expect(result).toHaveProperty("file");

		// Check the segments
		expect(result.segments).toHaveLength(1);
		expect(result.segments[0]).toMatchObject({
			text: "Hello World",
			number: 1,
			hash: expect.any(String),
		});

		// Check the mdastJson structure
		expect(result.mdastJson).toMatchObject({
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", value: "Hello World" }],
				},
			],
		});
	});

	it("should handle multiple HTML paragraphs correctly", async () => {
		const html = "<p>First paragraph</p><p>Second paragraph</p>";
		const result = await htmlToMdastWithSegments({ html });

		expect(result.segments).toHaveLength(2);
		expect(result.segments[0]).toMatchObject({
			text: "First paragraph",
			number: 1,
			hash: expect.any(String),
		});
		expect(result.segments[1]).toMatchObject({
			text: "Second paragraph",
			number: 2,
			hash: expect.any(String),
		});
	});

	it("should include header in segments when provided", async () => {
		const header = "Document Title";
		const html = "<p>Content paragraph</p>";
		const result = await htmlToMdastWithSegments({ header, html });

		expect(result.segments).toHaveLength(2);
		expect(result.segments[0]).toMatchObject({
			text: "Document Title",
			number: 0, // Header should be number 0
			hash: expect.any(String),
		});
		expect(result.segments[1]).toMatchObject({
			text: "Content paragraph",
			number: 1,
			hash: expect.any(String),
		});
	});

	it("should handle HTML with headings, lists, and other elements", async () => {
		const html = `
      <h1>Title</h1>
      <p>Introduction paragraph</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <blockquote>A quote</blockquote>
    `;
		const result = await htmlToMdastWithSegments({ html });

		// Check extracted segments in order
		const texts = result.segments.map((segment) => segment.text);
		expect(texts).toContain("Title");
		expect(texts).toContain("Introduction paragraph");
		expect(texts).toContain("Item 1");
		expect(texts).toContain("Item 2");
		expect(texts).toContain("A quote");

		// Verify numbering is sequential
		const numbers = result.segments.map((segment) => segment.number);
		expect(numbers).toEqual([1, 2, 3, 4, 5]); // Starting from 1
	});

	it("should sanitize HTML by removing dangerous elements", async () => {
		const html = '<p>Safe text</p><script>alert("danger")</script>';
		const result = await htmlToMdastWithSegments({ html });

		// Check that script tag is removed
		const textValues = JSON.stringify(result.mdastJson);
		expect(textValues).toContain("Safe text");
		expect(textValues).not.toContain("alert");
		expect(textValues).not.toContain("danger");

		// Only the safe paragraph should be in segments
		expect(result.segments).toHaveLength(1);
		expect(result.segments[0].text).toBe("Safe text");
	});

	it("should handle empty HTML input", async () => {
		const html = "";
		const result = await htmlToMdastWithSegments({ html });

		expect(result.segments).toHaveLength(0);
		expect(result.mdastJson).toMatchObject({
			type: "root",
			children: [],
		});
	});

	it("should handle HTML with tables correctly", async () => {
		const html = `
      <table>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
        </tr>
        <tr>
          <td>Cell 1</td>
          <td>Cell 2</td>
        </tr>
      </table>
    `;
		const result = await htmlToMdastWithSegments({ html });

		// Table cells should be extracted as segments
		const tableTexts = result.segments.map((segment) => segment.text);
		expect(tableTexts.some((text) => text.includes("Header 1"))).toBeTruthy();
		expect(tableTexts.some((text) => text.includes("Header 2"))).toBeTruthy();
		expect(tableTexts.some((text) => text.includes("Cell 1"))).toBeTruthy();
		expect(tableTexts.some((text) => text.includes("Cell 2"))).toBeTruthy();
	});

	it("should generate unique hashes for identical texts appearing multiple times", async () => {
		const html = "<p>Repeated text</p><p>Repeated text</p>";
		const result = await htmlToMdastWithSegments({ html });

		expect(result.segments).toHaveLength(2);
		expect(result.segments[0].text).toBe("Repeated text");
		expect(result.segments[1].text).toBe("Repeated text");
		// Despite having the same text, hashes should be different
		expect(result.segments[0].hash).not.toBe(result.segments[1].hash);
	});

	it("should remove position data from the returned MDAST", async () => {
		const html = "<p>Text with position data</p>";
		const result = await htmlToMdastWithSegments({ html });

		expect(JSON.stringify(result.mdastJson)).not.toMatch(/"position":/);
	});
	it("should properly convert Markdown-compatible HTML tags to MDAST", async () => {
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
      <p>Paragraph with <img src="https://evame/uploads/test.jpg" alt="Test image" /> embedded image</p>
      <hr>
      <p>Paragraph after horizontal rule</p>
    `;

		const result = await htmlToMdastWithSegments({ html });

		// Verify segments contain the correct text with formatting stripped
		const segmentTexts = result.segments.map((segment) => segment.text);
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
		expect(segmentTexts).toContain("Paragraph with Test image embedded image");
		expect(segmentTexts).toContain("Paragraph after horizontal rule");

		// Check MDAST structure for various elements
		const mdast = result.mdastJson;

		// Find nodes by type in the MDAST
		//biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const findNodesByType = (node: any, type: string): any[] => {
			//biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const matches: any[] = [];
			if (node.type === type) matches.push(node);
			if (node.children) {
				for (const child of node.children) {
					matches.push(...findNodesByType(child, type));
				}
			}
			return matches;
		};

		// Verify headings
		const headings = findNodesByType(mdast, "heading");
		expect(headings.length).toBeGreaterThanOrEqual(2);
		expect(headings.some((h) => h.depth === 1)).toBeTruthy();
		expect(headings.some((h) => h.depth === 2)).toBeTruthy();

		// Verify formatting elements
		const strongNodes = findNodesByType(mdast, "strong");
		expect(strongNodes.length).toBeGreaterThanOrEqual(1);

		const emphasisNodes = findNodesByType(mdast, "emphasis");
		expect(emphasisNodes.length).toBeGreaterThanOrEqual(1);

		// Verify links
		const linkNodes = findNodesByType(mdast, "link");
		expect(linkNodes.length).toBeGreaterThanOrEqual(1);
		expect(
			linkNodes.some((link) => link.url === "https://example.com"),
		).toBeTruthy();

		// Verify code elements
		const inlineCodeNodes = findNodesByType(mdast, "inlineCode");
		expect(inlineCodeNodes.length).toBeGreaterThanOrEqual(1);

		const codeBlockNodes = findNodesByType(mdast, "code");
		expect(codeBlockNodes.length).toBeGreaterThanOrEqual(1);
		expect(
			codeBlockNodes.some((code) => code.value.includes("Code block")),
		).toBeTruthy();

		// Verify blockquote
		const blockquoteNodes = findNodesByType(mdast, "blockquote");
		expect(blockquoteNodes.length).toBeGreaterThanOrEqual(1);

		// Verify lists
		const listNodes = [...findNodesByType(mdast, "list")];
		expect(listNodes.length).toBeGreaterThanOrEqual(2);
		expect(listNodes.some((list) => list.ordered === false)).toBeTruthy(); // unordered list
		expect(listNodes.some((list) => list.ordered === true)).toBeTruthy(); // ordered list

		// Verify list items
		const listItemNodes = findNodesByType(mdast, "listItem");
		expect(listItemNodes.length).toBeGreaterThanOrEqual(4);

		// Verify images
		const imageNodes = findNodesByType(mdast, "image");
		expect(imageNodes.length).toBeGreaterThanOrEqual(1);
		expect(
			imageNodes.some(
				(img) => img.url === "https://evame/uploads/test.jpg" && img.alt === "Test image",
			),
		).toBeTruthy();

		// Verify thematic break (hr)
		const thematicBreakNodes = findNodesByType(mdast, "thematicBreak");
		expect(thematicBreakNodes.length).toBeGreaterThanOrEqual(1);
	});
});
