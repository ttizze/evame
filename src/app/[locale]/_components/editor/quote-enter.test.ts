import { buildEditorFromExtensions } from "@lexical/extension";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { $createQuoteNode, RichTextExtension } from "@lexical/rich-text";
import {
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	defineExtension,
	INSERT_PARAGRAPH_COMMAND,
	type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vitest";
import { MarkdownExtension } from "./markdown";
import { QuoteEnterExtension } from "./quote-enter";

function createEditor() {
	return buildEditorFromExtensions(
		defineExtension({
			name: "quote-enter-test",
			dependencies: [RichTextExtension, MarkdownExtension, QuoteEnterExtension],
		}),
	);
}

function enter(editor: LexicalEditor) {
	editor.update(
		() => editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined),
		{
			discrete: true,
		},
	);
}

function type(editor: LexicalEditor, text: string) {
	editor.update(
		() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) selection.insertText(text);
		},
		{ discrete: true },
	);
}

const markdown = (editor: LexicalEditor) =>
	editor.read(() => $convertToMarkdownString()).trim();

describe("引用の中のReturn", () => {
	it("メニューや「> 」で作った引用でも、Returnで同じ引用の中に次の行を作る", () => {
		const editor = createEditor();
		editor.update(
			() => {
				const text = $createTextNode("引用文");
				$getRoot().clear().append($createQuoteNode().append(text));
				text.selectEnd();
			},
			{ discrete: true },
		);
		enter(editor);
		type(editor, "次の行");
		expect(markdown(editor)).toBe("> 引用文\n>\n> 次の行");
	});

	it("読み込んだ引用の最後の空の行でReturnを押すと、引用を抜けて続きを書ける", () => {
		const editor = createEditor();
		editor.update(
			() => {
				$convertFromMarkdownString("> 引用文");
				$getRoot().getLastDescendant()?.selectEnd();
			},
			{ discrete: true },
		);
		enter(editor);
		enter(editor);
		type(editor, "外の段落");
		expect(markdown(editor)).toBe("> 引用文\n\n外の段落");
	});

	it("引用の途中の空の行でReturnを押すと、そこで引用を2つに分ける", () => {
		const editor = createEditor();
		editor.update(
			() => {
				$convertFromMarkdownString("> 一\n>\n> 二");
				$getRoot().getFirstDescendant()?.selectEnd();
			},
			{ discrete: true },
		);
		enter(editor);
		enter(editor);
		type(editor, "間");
		expect(markdown(editor)).toBe("> 一\n\n間\n\n> 二");
	});

	it("空の引用でReturnを押すと、引用をやめて普通の段落にする", () => {
		const editor = createEditor();
		editor.update(
			() => {
				const quote = $createQuoteNode();
				$getRoot().clear().append(quote);
				quote.select();
			},
			{ discrete: true },
		);
		enter(editor);
		type(editor, "普通の段落");
		expect(markdown(editor)).toBe("普通の段落");
	});
});
