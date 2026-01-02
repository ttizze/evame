import type { Paragraph, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { VFile } from "vfile";
import { describe, expect, it } from "vitest";
import { remarkCustomBlocks } from "./remark-custom-blocks";

async function parseMarkdown(markdown: string): Promise<Root> {
	const processor = unified().use(remarkParse).use(remarkCustomBlocks);
	const file = new VFile({ value: markdown });
	let tree = processor.parse(file);
	tree = await processor.run(tree, file);
	return tree as Root;
}

function findParagraphByClass(tree: Root, className: string): Paragraph | null {
	for (const child of tree.children) {
		if (child.type !== "paragraph") continue;
		const data = child.data as { hProperties?: { class?: string } } | undefined;
		if (data?.hProperties?.class === className) {
			return child as Paragraph;
		}
	}
	return null;
}

describe("remarkCustomBlocks", () => {
	it("gatha/indent/centreブロックはMDASTのparagraphに変換され、data.hProperties.classが付与される", async () => {
		const markdown = [
			"::gatha1\nGatha line one\n::",
			"::gathalast\nGatha line last\n::",
			"::indent\nIndented sentence\n::",
			"::centre\nCentered sentence\n::",
		].join("\n\n");
		const tree = await parseMarkdown(markdown);

		expect(
			mdastToString(findParagraphByClass(tree, "gatha1") as Paragraph),
		).toBe("Gatha line one");
		expect(
			mdastToString(findParagraphByClass(tree, "gathalast") as Paragraph),
		).toBe("Gatha line last");
		expect(
			mdastToString(findParagraphByClass(tree, "indent") as Paragraph),
		).toBe("Indented sentence");
		expect(
			mdastToString(findParagraphByClass(tree, "centre") as Paragraph),
		).toBe("Centered sentence");
	});

	it("装飾を含むgathaブロックはMDASTのparagraphになり、data.hProperties.classが付与される", async () => {
		const markdown = "::gatha1\nLine **bold** end\n::";
		const tree = await parseMarkdown(markdown);

		const paragraph = findParagraphByClass(tree, "gatha1");
		expect(paragraph).not.toBeNull();
		expect(mdastToString(paragraph as Paragraph)).toBe("Line bold end");
	});

	it("インラインのnote/pb記法はHTMLノードに変換される", async () => {
		const markdown = "Text {note:note} {pb:P:1.0001} end";
		const tree = await parseMarkdown(markdown);

		const paragraph = tree.children.find(
			(node) => node.type === "paragraph",
		) as Paragraph;
		const htmlNodes = paragraph.children.filter((node) => node.type === "html");
		const htmlValues = htmlNodes.map((node) => node.value).join(" ");

		expect(htmlValues).toContain('class="note"');
		expect(htmlValues).toContain('class="pb"');
	});

	it("未知のブロック記法はテキストとして残る", async () => {
		const markdown = "::unknown\nText\n::";
		const tree = await parseMarkdown(markdown);

		const paragraph = tree.children.find(
			(node) => node.type === "paragraph",
		) as Paragraph;
		expect(mdastToString(paragraph)).toBe("::unknown\nText\n::");
	});
});
