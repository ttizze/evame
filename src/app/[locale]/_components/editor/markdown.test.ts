import { buildEditorFromExtensions } from "@lexical/extension";
import {
	$createListItemNode,
	$createListNode,
	ListItemNode,
} from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { $createQuoteNode } from "@lexical/rich-text";
import {
	$createTableCellNode,
	$createTableNode,
	$createTableRowNode,
} from "@lexical/table";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$nodesOfType,
	defineExtension,
	type Klass,
	type LexicalNode,
} from "lexical";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { describe, expect, it } from "vitest";
import { mdastToMarkdown } from "../../_domain/mdast-to-markdown";
import { MarkdownExtension } from "./markdown";
import { ImageNode, TweetNode } from "./media-nodes";
import { ShortcutsExtension } from "./shortcuts";
import {
	DefinitionNode,
	FootnoteDefinitionNode,
	FootnoteReferenceNode,
	HtmlBlockNode,
	HtmlNode,
} from "./syntax-nodes";

function createMarkdownEditor() {
	return buildEditorFromExtensions(
		defineExtension({
			name: "markdown-test",
			dependencies: [MarkdownExtension],
		}),
	);
}

/** 保存前後のMarkdownを同じremark設定で描画し、表示される内容と構造を比べる。 */
function rendered(markdown: string) {
	const processor = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true });
	const tree = processor.runSync(processor.parse(markdown));
	removePosition(tree, { force: true });
	return tree;
}

describe("保存済みのMDASTを開いて保存し直す", () => {
	const text = (value: string) => ({ type: "text", value });
	const paragraph = (...children: unknown[]) => ({
		type: "paragraph",
		children,
	});
	const strong = (value: string) => ({
		type: "strong",
		children: [text(value)],
	});
	const url = "https://example.com/a";
	const link = (href: string, ...children: unknown[]) => ({
		type: "link",
		url: href,
		title: null,
		children,
	});
	for (const [name, children] of [
		["URLと同じ文字列のリンク", [paragraph(link(url, text(url)))]],
		[
			"文中のURLと同じ文字列のリンク",
			[paragraph(text("前 "), link(url, text(url)), text(" 後"))],
		],
		[
			"かぎ括弧で終わる太字の直後の和文",
			[paragraph(strong("「重要」"), text("です"))],
		],
		[
			"コロンで終わる太字の直後の和文",
			[paragraph(strong("注意:"), text("本文"))],
		],
		[
			"句点で終わる太字の直後の和文",
			[paragraph(strong("重要。"), text("次の文"))],
		],
		[
			"かぎ括弧で終わる斜体の直後の和文",
			[
				paragraph(
					{ type: "emphasis", children: [text("「斜体」")] },
					text("です"),
				),
			],
		],
		["行頭が番号に見える段落", [paragraph(text("1. はじめに"))]],
		["行頭が見出しに見える段落", [paragraph(text("# 見出し風"))]],
		["行頭が箇条書きに見える段落", [paragraph(text("- 箇条書き風"))]],
		["行頭が引用に見える段落", [paragraph(text("> 引用風"))]],
		["区切り線に見える段落", [paragraph(text("---"))]],
		["文字としての文字参照", [paragraph(text("&amp; と &lt;"))]],
		[
			"リンク付きの画像",
			[
				paragraph(
					link("https://example.com/h", {
						type: "image",
						url: "https://example.com/a.png",
						alt: "alt",
						title: null,
					}),
				),
			],
		],
	] as const) {
		it(`${name}は内容と構造を変えない`, () => {
			const stored = mdastToMarkdown({ type: "root", children } as never);
			const editor = createMarkdownEditor();
			editor.update(() => $convertFromMarkdownString(stored), {
				discrete: true,
			});
			expect(rendered(editor.read($convertToMarkdownString))).toEqual(
				rendered(stored),
			);
		});
	}
});

it("本文に入力したURLは公開時もリンクになる形で保存する", () => {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "markdown-autolink-test",
			dependencies: [MarkdownExtension, ShortcutsExtension],
		}),
	);
	editor.update(
		() => {
			$getRoot().append(
				$createParagraphNode().append($createTextNode("https://example.com/a")),
			);
		},
		{ discrete: true },
	);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("<https://example.com/a>"),
	);
});

describe("LexicalとMarkdownの往復", () => {
	it("ツールバーで作った引用の本文を保存する", () => {
		const editor = createMarkdownEditor();
		editor.update(
			() => {
				$getRoot().append(
					$createQuoteNode().append($createTextNode("引用本文")),
				);
			},
			{ discrete: true },
		);
		expect(editor.read(() => $convertToMarkdownString())).toContain(
			"> 引用本文",
		);
	});
	it("表のセルに複数段落を入力しても後の段落を失わない", () => {
		const editor = createMarkdownEditor();
		editor.update(
			() => {
				$getRoot().append(
					$createTableNode().append(
						$createTableRowNode().append(
							$createTableCellNode().append(
								$createParagraphNode().append($createTextNode("前半")),
								$createParagraphNode().append($createTextNode("後半")),
							),
						),
					),
				);
			},
			{ discrete: true },
		);
		const markdown = editor.read(() => $convertToMarkdownString());
		expect(markdown).toContain("前半");
		expect(markdown).toContain("後半");
	});
	for (const [name, markdown, nodes] of [
		[
			"見出し・日本語・装飾・リンク",
			'# 見出し1\n\n###### 見出し6\n\nこれは**太字**と*斜体*、~~取り消し~~と`コード`。\n\n[リンク](https://example.com/path "題名")',
			[],
		],
		[
			"画像と代替テキスト",
			'![画像の説明](https://example.com/image.png "画像タイトル")',
			[[ImageNode, 1]],
		],
		[
			"括弧を含む画像URLとエスケープされた代替テキスト",
			'前文 ![画像\\]の説明](https://example.com/a_(b).png "題名") 後文',
			[[ImageNode, 1]],
		],
		["入れ子のリスト", "- 親\n  - 子\n    - 孫\n- 続き", []],
		["段落を含むリスト", "- 第一段落\n\n  第二段落\n\n- 別の項目", []],
		[
			"参照形式のリンクと画像",
			'[リンク][ref]と![画像][img]\n\n[ref]: https://example.com "参照先"\n[img]: https://example.com/i.png',
			[[ImageNode, 1]],
		],
		[
			"引用の中の参照形式のリンク",
			"> 引用と[リンク][ref]。\n\n[ref]: https://example.com/reference",
			[],
		],
		[
			"GFMの表と列の配置",
			"| 名前 | 値 |\n| :--- | ---: |\n| **太字** | `code` |\n| パイプ \\| | 日本語 |",
			[],
		],
		[
			"チェックリストと開始番号付きリスト",
			"- [x] 完了\n- [ ] 未完了\n\n3. 三番目\n4. 四番目",
			[],
		],
		[
			"複数段落と入れ子のある引用",
			"> 第一段落\n>\n> 第二段落\n>\n> - 箇条書き\n> - 続き",
			[],
		],
		["コードと改行", "```ts\nconst value = '<tag>';\n```\n\n前半\\\n後半", []],
		[
			"Xの埋め込みリンク",
			"https://x.com/example/status/1234567890123456789",
			[[TweetNode, 1]],
		],
		[
			"ブロックと行内のHTML",
			"<details><summary>概要</summary>内容</details>\n\n文中の<kbd>Ctrl</kbd>と改行<br>の後",
			[
				[HtmlBlockNode, 1],
				// 行内の<kbd>・</kbd>・<br>
				[HtmlNode, 3],
			],
		],
		[
			"連続するブロックのHTML",
			"<div>一つ目</div>\n\n<div>二つ目</div>",
			[[HtmlBlockNode, 2]],
		],
		[
			"脚注",
			"本文[^note]と別の注[^2]。\n\n[^note]: 注釈の**本文**。\n\n[^2]: 二つ目",
			[
				[FootnoteReferenceNode, 2],
				[FootnoteDefinitionNode, 2],
			],
		],
		[
			"HTMLを含む脚注",
			"本文[^a]\n\n[^a]: 注\n\n    <div>注のHTML</div>",
			[[HtmlBlockNode, 1]],
		],
		[
			"使われていない参照定義",
			'本文\n\n[ref]: https://example.com/target "題名"',
			[[DefinitionNode, 1]],
		],
	] as [string, string, [Klass<LexicalNode>, number][]][]) {
		it(`${name}を読み込み、保存し直しても表示される内容と構造を保つ`, () => {
			const editor = createMarkdownEditor();
			editor.update(() => $convertFromMarkdownString(markdown), {
				discrete: true,
			});
			for (const [klass, count] of nodes)
				expect(editor.read(() => $nodesOfType(klass).length)).toBe(count);
			const saved = editor.read(() => $convertToMarkdownString());
			expect(rendered(saved)).toEqual(rendered(markdown));
		});
	}
	it("使われていない参照定義を保存し、後から書いた参照リンクの宛先と題名に使える", () => {
		const editor = createMarkdownEditor();
		editor.update(
			() =>
				$convertFromMarkdownString(
					'本文\n\n[ref]: https://example.com/target "題名"',
				),
			{ discrete: true },
		);
		const saved = editor.read(() => $convertToMarkdownString());
		expect(rendered(`${saved}\n\n[参照][ref]`)).toEqual(
			rendered('本文\n\n[参照](https://example.com/target "題名")'),
		);
	});
	it("空のチェック項目だけのリストを保存して読み込み直しても、チェック項目のまま空で開く", () => {
		const editor = createMarkdownEditor();
		editor.update(
			() =>
				$getRoot()
					.clear()
					.append($createListNode("check").append($createListItemNode(false))),
			{ discrete: true },
		);
		const saved = editor.read(() => $convertToMarkdownString());
		expect(JSON.stringify(rendered(saved))).toContain('"type":"checkbox"');
		editor.update(() => $convertFromMarkdownString(saved), { discrete: true });
		expect(
			editor.read(() =>
				$nodesOfType(ListItemNode).map((item) => [
					item.getChecked(),
					item.getTextContent(),
				]),
			),
		).toEqual([[false, ""]]);
		expect(editor.read(() => $convertToMarkdownString())).toBe(saved);
	});
	it("脚注の本文は段落として編集でき、編集した内容を保存する", () => {
		const editor = createMarkdownEditor();
		editor.update(() => $convertFromMarkdownString("本文[^a]\n\n[^a]: 注"), {
			discrete: true,
		});
		editor.update(
			() => {
				const [definition] = $nodesOfType(FootnoteDefinitionNode);
				definition.getFirstDescendant()?.selectEnd().insertText("を追記");
			},
			{ discrete: true },
		);
		expect(rendered(editor.read(() => $convertToMarkdownString()))).toEqual(
			rendered("本文[^a]\n\n[^a]: 注を追記"),
		);
	});
});
