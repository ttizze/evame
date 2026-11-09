import { buildEditorFromExtensions } from "@lexical/extension";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import {
	$createQuoteNode,
	$isQuoteNode,
	RichTextExtension,
} from "@lexical/rich-text";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	defineExtension,
	INSERT_LINE_BREAK_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vitest";
import { $setBlockType } from "./block-type";
import { MarkdownExtension } from "./markdown";
import { QuoteExtension } from "./quote";
import { ShortcutsExtension } from "./shortcuts";

function createEditor() {
	return buildEditorFromExtensions(
		defineExtension({
			name: "quote-enter-test",
			dependencies: [
				RichTextExtension,
				MarkdownExtension,
				ShortcutsExtension,
				QuoteExtension,
			],
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
	it("読み込み・メニュー・Markdown入力の引用を、段落を持つ同じ構造に揃える", () => {
		for (const origin of ["読み込み", "メニュー", "Markdown入力"]) {
			const editor = createEditor();
			editor.update(
				() => {
					if (origin === "読み込み") $convertFromMarkdownString("> 本文");
					else {
						const paragraph = $createParagraphNode();
						$getRoot().clear().append(paragraph);
						paragraph.select();
					}
				},
				{ discrete: true },
			);
			if (origin === "メニュー")
				editor.update(() => $setBlockType("quote"), { discrete: true });
			if (origin === "Markdown入力") {
				type(editor, ">");
				type(editor, " ");
			}
			if (origin !== "読み込み") type(editor, "本文");
			editor.read(() => {
				const quote = $getRoot().getFirstChild();
				if (!$isQuoteNode(quote))
					throw new Error(`${origin}: 引用が作られていない`);
				expect(quote.isShadowRoot(), origin).toBe(true);
				expect(quote.getFirstChild()?.getType(), origin).toBe("paragraph");
			});
			expect(markdown(editor), origin).toBe("> 本文");
		}
	});
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

	it("作った引用で改行（Shift+Enter）した直後にReturnを押しても、同じ引用の中に次の行を作る", () => {
		const editor = createEditor();
		editor.update(
			() => {
				const text = $createTextNode("引用文");
				$getRoot().clear().append($createQuoteNode().append(text));
				text.selectEnd();
			},
			{ discrete: true },
		);
		editor.update(
			() => editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false),
			{ discrete: true },
		);
		enter(editor);
		type(editor, "次の行");
		// 行末の改行はMarkdownで表せないため書き出しは標準に任せ、引用を抜けずに次の行が入ることを確かめる。
		const lines = markdown(editor).split("\n");
		expect(lines[0]).toBe("> 引用文");
		expect(lines.at(-1)).toBe("> 次の行");
		expect(lines.every((line) => line.startsWith(">"))).toBe(true);
	});

	it("作った引用で範囲を選んでReturnを押しても、引用を抜けずにその位置で分ける", () => {
		const editor = createEditor();
		editor.update(
			() => {
				const text = $createTextNode("前後の文字");
				$getRoot().clear().append($createQuoteNode().append(text));
				text.select(1, 2);
			},
			{ discrete: true },
		);
		enter(editor);
		expect(markdown(editor)).toBe("> 前\n>\n> の文字");
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
