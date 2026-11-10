import { buildEditorFromExtensions } from "@lexical/extension";
import { $isListNode } from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { $createQuoteNode, $isQuoteNode } from "@lexical/rich-text";
import {
	$createRangeSelection,
	$createTextNode,
	$getRoot,
	$setSelection,
	defineExtension,
	type LexicalEditor,
} from "lexical";
import { toString as plainText } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { $currentBlockType, $setBlockType } from "./block-type";
import { DocumentExtension } from "./document";

function editorWith(markdown: string) {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "block-type-test",
			dependencies: [DocumentExtension],
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
	it("子リストから始まる親の次を標準テキストにしても後続番号を保つ", () => {
		const editor = editorWith("1. - 子\n\n   親本文\n2. 対象\n3. 後");
		editor.update(
			() =>
				$getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "対象")
					?.selectEnd(),
			{ discrete: true },
		);
		apply(editor, "paragraph");
		expect(markdown(editor)).toBe("1. - 子\n\n   親本文\n\n対象\n\n3. 後");
	});
	it.each(["paragraph", "h2", "quote", "code"] as const)(
		"親の本文の間にある子項目を%sへ変えても前後の本文と順序を保つ",
		(type) => {
			const editor = editorWith("- 前半\n  - 子\n\n  後半");
			editor.update(
				() =>
					$getRoot()
						.getAllTextNodes()
						.find((node) => node.getTextContent() === "子")
						?.selectEnd(),
				{ discrete: true },
			);
			apply(editor, type);
			expect(
				plainText(unified().use(remarkParse).parse(markdown(editor))),
			).toBe("前半子後半");
		},
	);
	for (const backward of [false, true])
		for (const [rest, expected] of [
			["## 見出し", "見出し"],
			["- 項目\n- 選択外", "項目\n\n- 選択外"],
		])
			it(`引用から外側の見出し・リストをまたいで標準テキストにしても残りの選択を変換する（逆向き=${backward}、${rest}）`, () => {
				const editor = editorWith(`> 引用\n\n${rest}`);
				editor.update(
					() => {
						const texts = $getRoot().getAllTextNodes();
						const first = texts[0],
							last = texts[1];
						const selection = $createRangeSelection();
						selection.anchor.set(
							(backward ? last : first).getKey(),
							backward ? last.getTextContentSize() : 0,
							"text",
						);
						selection.focus.set(
							(backward ? first : last).getKey(),
							backward ? 0 : last.getTextContentSize(),
							"text",
						);
						$setSelection(selection);
					},
					{ discrete: true },
				);
				apply(editor, "paragraph");
				expect(markdown(editor)).toBe(`引用\n\n${expected}`);
			});
	it("同じリストの種類を選び直しても項目と番号を保つ", () => {
		const editor = editorWith("3. 一\n4. 二\n5. 三");
		apply(editor, "number");
		expect(markdown(editor)).toBe("3. 一\n4. 二\n5. 三");
	});

	it("中央の項目を箇条書きにしても前後の種類と番号を保つ", () => {
		const editor = editorWith("3. 一\n4. 二\n5. 三");
		editor.update(
			() => {
				const list = $getRoot().getFirstChild();
				if ($isListNode(list)) list.getChildren()[1]?.selectEnd();
			},
			{
				discrete: true,
			},
		);
		apply(editor, "bullet");
		expect(markdown(editor)).toBe("3. 一\n\n- 二\n\n5. 三");
	});
	it("番号付きリストの中の箇条書きでは、内側のリストの種類を判定する", () => {
		const editor = editorWith("1. 親\n   - 子");
		expect(editor.read(() => $currentBlockType())).toBe("bullet");
	});

	it("段落を持つ引用の中で引用を選ぶと、引用の中に引用を作らず引用を解除する", () => {
		const editor = editorWith("> 一\n>\n> 二");
		expect(editor.read(() => $currentBlockType())).toBe("quote");
		apply(editor, "quote");
		expect(markdown(editor)).toBe("一\n\n二");
	});

	it("引用の中で「> 」と打って作った入れ子の引用では、カーソルのある内側の引用だけを解除する", () => {
		for (const type of ["quote", "paragraph"] as const) {
			const editor = editorWith("> 一");
			editor.update(
				() => {
					const outer = $getRoot().getFirstChild();
					const inner = $createQuoteNode().append($createTextNode("二"));
					if ($isQuoteNode(outer)) outer.append(inner);
					inner.selectEnd();
				},
				{ discrete: true },
			);
			expect(markdown(editor), type).toBe("> 一\n>\n> > 二");
			apply(editor, type);
			expect(markdown(editor), type).toBe("> 一\n>\n> 二");
		}
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
