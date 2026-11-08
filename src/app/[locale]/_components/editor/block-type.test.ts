import { buildEditorFromExtensions } from "@lexical/extension";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { RichTextExtension } from "@lexical/rich-text";
import { $getRoot, defineExtension, type LexicalEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { $currentBlockType, $setBlockType } from "./block-type";
import { MarkdownExtension } from "./markdown";

function editorWith(markdown: string) {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "block-type-test",
			dependencies: [RichTextExtension, MarkdownExtension],
		}),
	);
	editor.update(
		() => {
			$convertFromMarkdownString(markdown);
			$getRoot().getLastDescendant()?.selectEnd();
		},
		{ discrete: true },
	);
	return editor;
}

const apply = (
	editor: LexicalEditor,
	type: Parameters<typeof $setBlockType>[0],
) => editor.update(() => $setBlockType(type), { discrete: true });
const markdown = (editor: LexicalEditor) =>
	editor.read(() => $convertToMarkdownString()).trim();

describe("ブロックの種類の変更", () => {
	it("段落を持つ引用の中で引用を選ぶと、引用の中に引用を作らず引用を解除する", () => {
		const editor = editorWith("> 一\n>\n> 二");
		expect(editor.read(() => $currentBlockType())).toBe("quote");
		apply(editor, "quote");
		expect(markdown(editor)).toBe("一\n\n二");
	});

	it("段落を持つ引用の中で標準のテキストを選んでも、引用を解除する", () => {
		const editor = editorWith("> 一\n>\n> 二");
		apply(editor, "paragraph");
		expect(markdown(editor)).toBe("一\n\n二");
	});

	it("同じ見出しをもう一度選ぶと標準のテキストに戻す", () => {
		const editor = editorWith("本文");
		apply(editor, "h2");
		expect(editor.read(() => $currentBlockType())).toBe("h2");
		expect(markdown(editor)).toBe("## 本文");
		apply(editor, "h2");
		expect(markdown(editor)).toBe("本文");
	});

	it("段落を引用にし、もう一度引用を選ぶと戻す", () => {
		const editor = editorWith("本文");
		apply(editor, "quote");
		expect(markdown(editor)).toBe("> 本文");
		apply(editor, "quote");
		expect(markdown(editor)).toBe("本文");
	});

	it("段落を持つ引用の中の段落を見出しにすると、引用の中で見出しにする", () => {
		const editor = editorWith("> 一\n>\n> 二");
		apply(editor, "h3");
		expect(markdown(editor)).toBe("> 一\n>\n> ### 二");
	});
});
