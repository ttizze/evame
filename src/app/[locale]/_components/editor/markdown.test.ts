import { $convertToMarkdownString } from "@lexical/markdown";
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
	createEditor,
} from "lexical";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";
import { editorNodes, importMarkdown, markdownTransformers } from "./markdown";
import { ImageNode } from "./media-nodes";

describe("LexicalとMarkdownの往復", () => {
	it("ツールバーで作った引用の本文を保存する", () => {
		const editor = createEditor({
			nodes: editorNodes,
			onError: (error) => {
				throw error;
			},
		});
		editor.update(
			() => {
				$getRoot().append(
					$createQuoteNode().append($createTextNode("引用本文")),
				);
			},
			{ discrete: true },
		);
		expect(
			editor
				.getEditorState()
				.read(() => $convertToMarkdownString(markdownTransformers)),
		).toContain("> 引用本文");
	});
	it("表のセルに複数段落を入力しても後の段落を失わない", () => {
		const editor = createEditor({
			nodes: editorNodes,
			onError: (error) => {
				throw error;
			},
		});
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
		const markdown = editor
			.getEditorState()
			.read(() => $convertToMarkdownString(markdownTransformers));
		expect(markdown).toContain("前半");
		expect(markdown).toContain("後半");
	});
	for (const [name, markdown] of [
		[
			"見出し・日本語・装飾・リンク",
			'## 見出し\n\nこれは**太字**と*斜体*、~~取り消し~~と`コード`。\n\n[リンク](https://example.com/path "題名")',
		],
		[
			"画像と代替テキスト",
			'![画像の説明](https://example.com/image.png "画像タイトル")',
		],
		[
			"括弧を含む画像URLとエスケープされた代替テキスト",
			'前文 ![画像\\]の説明](https://example.com/a_(b).png "題名") 後文',
		],
		["入れ子のリスト", "- 親\n  - 子\n    - 孫\n- 続き"],
		["段落を含むリスト", "- 第一段落\n\n  第二段落\n\n- 別の項目"],
		[
			"参照形式のリンク",
			'[リンク][ref]\n\n[ref]: https://example.com "参照先"',
		],
		[
			"GFMの表と列の配置",
			"| 名前 | 値 |\n| :--- | ---: |\n| **太字** | `code` |",
		],
		[
			"チェックリストと開始番号付きリスト",
			"- [x] 完了\n- [ ] 未完了\n\n3. 三番目\n4. 四番目",
		],
		[
			"複数段落と入れ子のある引用",
			"> 第一段落\n>\n> 第二段落\n>\n> - 箇条書き\n> - 続き",
		],
		["コードと改行", "```ts\nconst value = '<tag>';\n```\n\n前半\\\n後半"],
		["Xの埋め込みリンク", "https://x.com/example/status/1234567890123456789"],
		[
			"既存のHTMLと脚注",
			"<details><summary>概要</summary>内容</details>\n\n本文[^note]\n\n[^note]: 注釈",
		],
	]) {
		it(`${name}を読み込み、保存し直しても内容と構造を保つ`, () => {
			const editor = createEditor({
				nodes: editorNodes,
				onError: (error) => {
					throw error;
				},
			});
			editor.update(() => importMarkdown(markdown), { discrete: true });
			const result = editor
				.getEditorState()
				.read(() => $convertToMarkdownString(markdownTransformers));
			const processor = unified().use(remarkParse).use(remarkGfm);
			const expected = processor.parse(markdown);
			let imageCount = 0;
			visit(expected, "image", () => {
				imageCount++;
			});
			expect(
				editor.getEditorState().read(() => $nodesOfType(ImageNode).length),
			).toBe(imageCount);
			const actual = processor.parse(result);
			removePosition(expected, { force: true });
			removePosition(actual, { force: true });
			expect(actual).toEqual(expected);
		});
	}
});
