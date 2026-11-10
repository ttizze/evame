import { buildEditorFromExtensions } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import {
	$isListItemNode,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { RichTextExtension } from "@lexical/rich-text";
import {
	$createRangeSelection,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	configExtension,
	defineExtension,
	HISTORY_PUSH_TAG,
	INDENT_CONTENT_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	KEY_SPACE_COMMAND,
	KEY_TAB_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { expect, it } from "vitest";
import { $getBlockDropTarget } from "./block-drag-menu";
import {
	$moveEditorBlock,
	BlockEditingExtension,
	SET_TEXT_BLOCK_COMMAND,
	TabEditingExtension,
} from "./block-editing";
import { DocumentExtension } from "./document";
import { MarkdownExtension } from "./markdown";

it("区切りの段落を下へ移してリストが結合しても子リストの後ろの親本文を残す", () => {
	const editor = createListEditor(
		"- - 子A\n\n  本文A\n\n区切り\n\n- - 子B\n\n  本文B",
		"区切り",
	);
	editor.update(
		() => {
			const root = $getRoot();
			$moveEditorBlock(
				root.getChildren()[1].getKey(),
				root.getLastChildOrThrow().getKey(),
				"after",
			);
		},
		{ discrete: true },
	);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("- - 子A\n\n  本文A\n- - 子B\n\n  本文B\n\n区切り"),
	);
});

it("子リストを本文の間に持つ親にも箇条書きのマーカーを表示する", () => {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "parent-marker",
			theme: {
				tableScrollableWrapper: "table",
				list: { nested: { listitem: "hide-marker" } },
			},
			dependencies: [DocumentExtension],
		}),
	);
	const style = document.createElement("style");
	style.textContent = ".hide-marker { list-style-type: none; }";
	document.head.append(style);
	const root = document.createElement("div");
	document.body.append(root);
	editor.setRootElement(root);
	try {
		editor.update(
			() => $convertFromMarkdownString("- 前半\n  - 子\n\n  後半"),
			{ discrete: true },
		);
		const element = root.querySelector("li");
		expect(element).not.toBeNull();
		expect(getComputedStyle(element!).listStyleType).not.toBe("none");
	} finally {
		editor.setRootElement(null);
		root.remove();
		style.remove();
	}
});

it.each([
	[INSERT_ORDERED_LIST_COMMAND, "- 前半\n  1. 子\n\n  後半"],
	[OUTDENT_CONTENT_COMMAND, "- 前半\n\n  後半\n\n- 子"],
] as const)(
	"親の前半・後半の間の子リストを変更しても親本文を保存・Undo・Redoで保つ（%s）",
	async (command, expected) => {
		const source = "- 前半\n  - 子\n\n  後半";
		const editor = buildEditorFromExtensions(
			defineExtension({
				name: "list-parent-body",
				theme: { tableScrollableWrapper: "table" },
				dependencies: [
					DocumentExtension,
					configExtension(HistoryExtension, { disabled: false }),
				],
			}),
		);
		editor.update(
			() => {
				$convertFromMarkdownString(source);
				$getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "子")
					?.selectEnd();
			},
			{ discrete: true },
		);
		await editor.dispatchCommand(command, undefined);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(expected),
		);
		await editor.dispatchCommand(UNDO_COMMAND, undefined);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(source),
		);
		await editor.dispatchCommand(REDO_COMMAND, undefined);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(expected),
		);
		const saved = editor.read($convertToMarkdownString);
		editor.update(() => $convertFromMarkdownString(saved), { discrete: true });
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(expected),
		);
	},
);

it("入れ子で5.と空白を打って作った番号付きリストは5から保存する", async () => {
	const editor = createListEditor("- 親\n  - 対象", "対象");
	editor.update(
		() => {
			$getRoot().getAllTextNodes().at(-1)?.setTextContent("5.").selectEnd();
		},
		{ discrete: true },
	);
	await editor.dispatchCommand(
		KEY_SPACE_COMMAND,
		new KeyboardEvent("keydown", { key: " ", cancelable: true }),
	);
	expect(editor.read($convertToMarkdownString)).toMatch(/\n\s+5\./);
});

for (const [name, before, start, end, command, after] of [
	[
		"通常本文まで選択して番号付きにしても選択外の項目を変えない",
		"- 選択外\n- 対象\n\n本文",
		"対象",
		"本文",
		INSERT_ORDERED_LIST_COMMAND,
		"- 選択外\n\n1. 対象\n2. 本文",
	],
	[
		"通常本文までの種類変更で選択外のチェック済み項目を保つ",
		"- [x] 選択外\n- [x] 対象\n\n本文",
		"対象",
		"本文",
		INSERT_ORDERED_LIST_COMMAND,
		"- [x] 選択外\n\n1. 対象\n2. 本文",
	],
	[
		"親と子を選んで番号付きへ変えると両方が変わり選択外の子は保つ",
		"- 親\n  - 子\n  - 選択外\n- 後",
		"親",
		"子",
		INSERT_ORDERED_LIST_COMMAND,
		"1. 親\n   1. 子\n   - 選択外\n\n- 後",
	],
	[
		"リストと通常の本文をまとめて選ぶと本文も番号付きへ変更できる",
		"- 項目\n\n本文",
		"項目",
		"本文",
		INSERT_ORDERED_LIST_COMMAND,
		"1. 項目\n2. 本文",
	],
	[
		"親と子を選択してTabを押しても子を余分に深くしない",
		"- 前\n- 親\n  - 子\n  - 子2\n- 後",
		"親",
		"子2",
		INDENT_CONTENT_COMMAND,
		"- 前\n  - 親\n    - 子\n    - 子2\n- 後",
	],
	[
		"二つの子項目を選択してShift+Tabを押しても順序を逆にしない",
		"- 親\n  - 子\n  - 子2\n- 後",
		"子",
		"子2",
		OUTDENT_CONTENT_COMMAND,
		"- 親\n- 子\n- 子2\n- 後",
	],
] as const) {
	it(name, async () => {
		const editor = createListEditor(before, start);
		editor.update(
			() => {
				const texts = $getRoot().getAllTextNodes();
				const first = texts.find((node) => node.getTextContent() === start);
				const last = texts.find((node) => node.getTextContent() === end);
				if (!first || !last) throw new Error("選択する項目がありません");
				const selection = $createRangeSelection();
				selection.anchor.set(first.getKey(), 0, "text");
				selection.focus.set(last.getKey(), last.getTextContentSize(), "text");
				$setSelection(selection);
			},
			{ discrete: true },
		);
		await editor.dispatchCommand(command, undefined);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(after),
		);
	});
}

for (const [value, after] of [
	["paragraph", "3. 前\n\n対象\n\n5. 後"],
	["h2", "3. 前\n\n## 対象\n\n5. 後"],
] as const) {
	it(`番号付きの中央項目を${value}へ変えても後続を5から保存する`, async () => {
		const editor = createListEditor("3. 前\n4. 対象\n5. 後", "対象");
		await editor.dispatchCommand(SET_TEXT_BLOCK_COMMAND, value);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(after),
		);
	});
}

for (const value of ["paragraph", "h2"] as const) {
	it(`番号付きの親の子項目を${value}へ変えても親の後続を4から保存する`, async () => {
		const editor = createListEditor("3. 親\n   - 対象\n4. 後", "対象");
		await editor.dispatchCommand(SET_TEXT_BLOCK_COMMAND, value);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(`3. 親\n\n${value === "h2" ? "## " : ""}対象\n\n4. 後`),
		);
	});
}

for (const [name, before, after, convert] of [
	["最上位で種類が違う項目", "- 前\n\n1. 対象", "- 前\n  1. 対象", false],
	[
		"入れ子で種類が違う項目",
		"- 親\n  - 前\n  1. 対象",
		"- 親\n  - 前\n    1. 対象",
		false,
	],
	[
		"入れ子で種類を変えた直後",
		"- 親\n  - 前\n  - 対象",
		"- 親\n  - 前\n    1. 対象",
		true,
	],
] as const) {
	it(`${name}でもTabで直前の項目の下へ入る`, async () => {
		const editor = createListEditor(before, "対象");
		if (convert)
			await editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
		await editor.dispatchCommand(
			KEY_TAB_COMMAND,
			new KeyboardEvent("keydown", { key: "Tab", cancelable: true }),
		);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(after),
		);
	});
}

for (const [name, key, before, after, indent, targetIndent] of [
	[
		"箇条書き",
		"Tab",
		"- 親\n  1. 既存\n- 対象\n\n本文",
		"- 親\n  1. 既存\n  - 対象\n\n本文",
		1,
		1,
	],
	[
		"番号付き",
		"Shift+Tab",
		"- 親\n  1. 既存\n  2. 対象\n\n本文",
		"- 親\n  1. 既存\n\n1. 対象\n\n本文",
		0,
		0,
	],
	[
		"項目内の見出し",
		"Tab",
		"- 前\n- ## 対象\n\n本文",
		"- 前\n  - ## 対象\n\n本文",
		1,
		0,
	],
] as const) {
	it(`${name}から通常本文まで選んで${key}しても項目の種類を保ち段落の字下げを処理する`, async () => {
		const editor = createListEditor(before, "対象");
		editor.update(
			() => {
				const texts = $getRoot().getAllTextNodes();
				const first = texts.find((node) => node.getTextContent() === "対象");
				const last = texts.find((node) => node.getTextContent() === "本文");
				if (!first || !last) throw new Error("選択対象がありません");
				const selection = $createRangeSelection();
				selection.anchor.set(first.getKey(), 0, "text");
				selection.focus.set(last.getKey(), last.getTextContentSize(), "text");
				$setSelection(selection);
			},
			{ discrete: true },
		);
		await editor.dispatchCommand(
			KEY_TAB_COMMAND,
			new KeyboardEvent("keydown", {
				key: "Tab",
				shiftKey: key === "Shift+Tab",
				cancelable: true,
			}),
		);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(after),
		);
		expect(
			editor.read(() =>
				$getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "対象")
					?.getParentOrThrow()
					.getIndent(),
			),
		).toBe(targetIndent);
		expect(
			editor.read(() =>
				$getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "本文")
					?.getParentOrThrow()
					.getIndent(),
			),
		).toBe(indent);
	});
}

function rendered(markdown: string) {
	const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
	const tree = processor.runSync(processor.parse(markdown));
	removePosition(tree, { force: true });
	return tree;
}

for (const [name, before, startText, endText, after] of [
	[
		"次の兄弟項目",
		"- 前\n- 対象\n- 次",
		"対象",
		"次",
		"- 前\n\n1. 対象\n\n- 次",
	],
	["最初の子項目", "- 親\n  - 子\n- 後", "親", "子", "1. 親\n   - 子\n\n- 後"],
] as const) {
	for (const backward of [false, true]) {
		it(`${name}の先頭まで${backward ? "逆向き" : "順向き"}に選んでもその文字を選んでいなければ変更しない`, async () => {
			const editor = createListEditor(before, startText);
			editor.update(
				() => {
					const texts = $getRoot().getAllTextNodes();
					const start = texts.find(
						(node) => node.getTextContent() === startText,
					);
					const end = texts.find((node) => node.getTextContent() === endText);
					if (!start || !end) throw new Error("項目がありません");
					const selection = $createRangeSelection();
					selection.anchor.set((backward ? end : start).getKey(), 0, "text");
					selection.focus.set((backward ? start : end).getKey(), 0, "text");
					$setSelection(selection);
				},
				{ discrete: true },
			);
			await editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
			expect(rendered(editor.read($convertToMarkdownString))).toEqual(
				rendered(after),
			);
		});
	}
}

for (const [offset, position] of [
	[0, "先頭"],
	[1, "途中"],
	[2, "末尾"],
] as const) {
	it(`入力済みの項目の${position}でTabとShift+Tabを押してもタブ文字を挿入せず階層を変える`, async () => {
		const editor = createListEditor("- 親\n- 対象", "対象");
		editor.update(
			() => {
				const node = $getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "対象");
				node?.select(offset, offset);
			},
			{ discrete: true },
		);
		await editor.dispatchCommand(
			KEY_TAB_COMMAND,
			new KeyboardEvent("keydown", { key: "Tab", cancelable: true }),
		);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered("- 親\n  - 対象"),
		);
		await editor.dispatchCommand(
			KEY_TAB_COMMAND,
			new KeyboardEvent("keydown", {
				key: "Tab",
				shiftKey: true,
				cancelable: true,
			}),
		);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered("- 親\n- 対象"),
		);
	});
}

function createListEditor(markdown: string, text: string) {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "evame-block-editing-test",
			dependencies: [TabEditingExtension, DocumentExtension],
		}),
	);
	editor.update(
		() => {
			$convertFromMarkdownString(markdown);
			const node = $getRoot()
				.getAllTextNodes()
				.find((node) => node.getTextContent() === text);
			if (!node) throw new Error("対象の項目がありません");
			node.selectEnd();
		},
		{ discrete: true },
	);
	return editor;
}

it("入れ子の一項目だけ番号付きにしても隣の箇条書きと子項目を変えない", async () => {
	const editor = createListEditor(
		"- 親\n  - 前\n  - 対象\n    - 子\n  - 後\n- 続き",
		"対象",
	);
	await editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("- 親\n  - 前\n  1. 対象\n     - 子\n  - 後\n- 続き"),
	);
});

it("入れ子の箇条書きの項目で箇条書きを選び直しても前後の項目とリストを分けない", async () => {
	const markdown = "- 親\n  - 前\n  - 対象\n  - 後\n- 続き";
	const editor = createListEditor(markdown, "対象");
	await editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered(markdown),
	);
});

it("番号付きの項目で番号付きを選び直してもUndo1回で直前の編集を戻せる", async () => {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "evame-block-editing-history-test",
			dependencies: [
				RichTextExtension,
				HistoryExtension,
				MarkdownExtension,
				BlockEditingExtension,
			],
		}),
	);
	editor.update(() => $convertFromMarkdownString("1. 前\n2. 対象\n3. 後"), {
		discrete: true,
	});
	editor.update(
		() => {
			$getRoot()
				.getAllTextNodes()
				.find((node) => node.getTextContent() === "対象")
				?.setTextContent("編集後")
				.selectEnd();
		},
		{ discrete: true, tag: HISTORY_PUSH_TAG },
	);
	await editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
	await editor.dispatchCommand(UNDO_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("1. 前\n2. 対象\n3. 後"),
	);
});

it("入れ子の空項目で1.と空白を打つとその項目だけ番号付きになる", async () => {
	const editor = createListEditor("- 親\n  - 前\n  - 対象\n  - 後", "対象");
	editor.update(
		() => {
			const node = $getRoot()
				.getAllTextNodes()
				.find((node) => node.getTextContent() === "対象");
			if ($isTextNode(node)) node.setTextContent("1.").selectEnd();
		},
		{ discrete: true },
	);
	await editor.dispatchCommand(
		KEY_SPACE_COMMAND,
		new KeyboardEvent("keydown", { key: " ", cancelable: true }),
	);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("- 親\n  - 前\n  1.\n  - 後"),
	);
});

for (const [name, markdown, marker, after] of [
	["番号付き", "1. 前\n2. 対象", "2020.", "1. 前\n2. 2020.本文"],
	["番号付き", "1. 前\n2. 対象", "1.", "1. 前\n2. 1.本文"],
	["箇条書き", "- 前\n- 対象", "-", "- 前\n- -本文"],
]) {
	it(`${name}の項目の先頭で${marker}の直後に空白を打っても打った文字を消さない`, async () => {
		const editor = createListEditor(markdown, "対象");
		editor.update(
			() => {
				const node = $getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "対象");
				if ($isTextNode(node))
					node
						.setTextContent(`${marker}本文`)
						.select(marker.length, marker.length);
			},
			{ discrete: true },
		);
		const event = new KeyboardEvent("keydown", { key: " ", cancelable: true });
		await editor.dispatchCommand(KEY_SPACE_COMMAND, event);
		expect(event.defaultPrevented).toBe(false);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(after),
		);
	});
}

for (const marker of ["a.", "i."]) {
	for (const [place, markdown] of [
		["段落", "対象"],
		["リスト項目", "- 対象"],
	]) {
		it(`${place}の先頭で${marker}と空白を打ってもリストへ変換しない`, async () => {
			const editor = createListEditor(markdown, "対象");
			editor.update(
				() => {
					const node = $getRoot()
						.getAllTextNodes()
						.find((node) => node.getTextContent() === "対象");
					if ($isTextNode(node)) node.setTextContent(marker).selectEnd();
				},
				{ discrete: true },
			);
			await editor.dispatchCommand(
				KEY_SPACE_COMMAND,
				new KeyboardEvent("keydown", { key: " ", cancelable: true }),
			);
			expect(rendered(editor.read($convertToMarkdownString))).toEqual(
				rendered(markdown.replace("対象", marker)),
			);
		});
	}
}

for (const [name, before, source, target, placement, after] of [
	[
		"見出しを複数段の子の直前へ落とすと親の前で見出しを保つ",
		"- 親\n  1. 子\n     - 孫\n\n## 見出し",
		"見出し",
		"子",
		"before",
		"## 見出し\n\n- 親\n  1. 子\n     - 孫",
	],
	[
		"見出しを複数段の子の直後へ落とすと親子全体の後で見出しを保つ",
		"## 見出し\n\n- 親\n  1. 子\n     - 孫",
		"見出し",
		"子",
		"after",
		"- 親\n  1. 子\n     - 孫\n\n## 見出し",
	],
	[
		"通常段落を入れ子項目の直前へ落とすと親の前へ種類を保って移す",
		"- 親\n  - 子\n\n本文",
		"本文",
		"子",
		"before",
		"本文\n\n- 親\n  - 子",
	],
	[
		"通常段落を入れ子項目の直後へ落とすと親子の後へ種類を保って移す",
		"本文\n\n- 親\n  - 子",
		"本文",
		"子",
		"after",
		"- 親\n  - 子\n\n本文",
	],
	[
		"通常段落をリストの先頭へ移しても箇条書きにしない",
		"- 項目\n\n本文",
		"本文",
		"項目",
		"before",
		"本文\n\n- 項目",
	],
	[
		"通常段落をリストの末尾へ移しても箇条書きにしない",
		"本文\n\n- 項目",
		"本文",
		"項目",
		"after",
		"- 項目\n\n本文",
	],
	[
		"番号付き項目の直前へ段落を入れても種類と後続番号を保つ",
		"本文\n\n3. 前\n4. 対象\n5. 後",
		"本文",
		"対象",
		"before",
		"3. 前\n\n本文\n\n4. 対象\n5. 後",
	],
	[
		"番号付き項目の直後へ段落を入れても種類と後続番号を保つ",
		"本文\n\n3. 前\n4. 対象\n5. 後",
		"本文",
		"対象",
		"after",
		"3. 前\n4. 対象\n\n本文\n\n5. 後",
	],
	[
		"見出しをリストへ移しても見出しの書式を失わない",
		"## 見出し\n\n- 親",
		"見出し",
		"親",
		"inside",
		"- 親\n  - ## 見出し",
	],
	[
		"兄弟項目を並べ替える",
		"- 最初\n- 次\n- 最後",
		"最初",
		"次",
		"after",
		"- 次\n- 最初\n- 最後",
	],
	[
		"親項目と種類の違う子をまとめて移動する",
		"- 親\n  1. 子\n     - 孫\n- 次",
		"親",
		"次",
		"after",
		"- 次\n- 親\n  1. 子\n     - 孫",
	],
	[
		"子項目を別の親の下へ入れる",
		"- 親\n  1. 子\n- 別の親",
		"子",
		"別の親",
		"inside",
		"- 親\n- 別の親\n  1. 子",
	],
	[
		"既存の子項目の末尾へ入れる",
		"- 親\n  - 既存\n- 移動",
		"移動",
		"親",
		"inside",
		"- 親\n  - 既存\n  - 移動",
	],
	[
		"番号付きの子を箇条書きの親と同じ深さへ出す",
		"- 親\n  1. 子\n  2. 後\n- 続き",
		"子",
		"親",
		"after",
		"- 親\n  1. 後\n\n1. 子\n\n- 続き",
	],
	[
		"子項目を本文の段落の後へ出す",
		"- 親\n  1. 子\n\n本文",
		"子",
		"本文",
		"after",
		"- 親\n\n本文\n\n1. 子",
	],
	[
		"親を自分の子の中へは移動しない",
		"- 親\n  - 子\n- 続き",
		"親",
		"子",
		"inside",
		"- 親\n  - 子\n- 続き",
	],
] as const) {
	it(name, () => {
		const editor = createListEditor(before, source);
		editor.update(
			() => {
				const texts = $getRoot().getAllTextNodes();
				const from = texts
					.find((node) => node.getTextContent() === source)
					?.getParentOrThrow();
				const to = texts
					.find((node) => node.getTextContent() === target)
					?.getParentOrThrow();
				if (!from || !to) throw new Error("項目がありません");
				const dropTarget = $getBlockDropTarget(
					to.getKey(),
					$isListItemNode(from),
					placement,
				);
				if (!dropTarget) throw new Error("移動先がありません");
				$moveEditorBlock(from.getKey(), dropTarget.getKey(), placement);
			},
			{ discrete: true },
		);
		const saved = editor.read($convertToMarkdownString);
		expect(rendered(saved)).toEqual(rendered(after));
	});
}

it("箇条書きの項目を番号付きの子と同じ場所へTabで入れても種類を保つ", async () => {
	const editor = createListEditor("- 親\n  1. 既存\n- 対象", "対象");
	await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("- 親\n  1. 既存\n  - 対象"),
	);
	await editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("- 親\n  1. 既存\n- 対象"),
	);
});

it("番号付きリストの中央だけ箇条書きへ変えても後続の元の番号を保つ", async () => {
	const editor = createListEditor("3. 前\n4. 対象\n5. 後", "対象");
	await editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("3. 前\n\n- 対象\n\n5. 後"),
	);
});

it("Undoなどで記法が文字として残った行の途中の空白では本文を消さない", async () => {
	const editor = createListEditor("- 対象", "対象");
	editor.update(
		() => {
			$getRoot().getAllTextNodes()[0].setTextContent("1. 残す文章").selectEnd();
		},
		{ discrete: true },
	);
	await editor.dispatchCommand(
		KEY_SPACE_COMMAND,
		new KeyboardEvent("keydown", { key: " ", cancelable: true }),
	);
	expect(editor.read(() => $getRoot().getTextContent())).toContain(
		"1. 残す文章",
	);
});

it("番号付きの空の子項目でEnterを押すと種類を保って一段だけ戻る", async () => {
	const editor = createListEditor("- 親\n  1. 前\n  2. 対象", "対象");
	editor.update(
		() => {
			const node = $getRoot()
				.getAllTextNodes()
				.find((node) => node.getTextContent() === "対象");
			node?.setTextContent("").selectEnd();
		},
		{ discrete: true },
	);
	await editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
	expect(rendered(editor.read($convertToMarkdownString))).toEqual(
		rendered("- 親\n  1. 前\n\n1."),
	);
});

for (const [name, before, after] of [
	["最上位の先頭", "3. 空\n4. 後", "戻った行\n\n4. 後"],
	["最上位の末尾", "3. 前\n4. 空", "3. 前\n\n戻った行"],
	["入れ子の先頭", "- 親\n  1. 空\n  2. 後", "- 親\n\n1. 戻った行\n\n   2. 後"],
	["入れ子の末尾", "- 親\n  1. 前\n  2. 空", "- 親\n  1. 前\n\n1. 戻った行"],
	["最上位", "3. 前\n4. 空\n5. 後", "3. 前\n\n戻った行\n\n5. 後"],
	[
		"入れ子の中央",
		"- 親\n  1. 前\n  2. 空\n  3. 後",
		"- 親\n  1. 前\n\n1. 戻った行\n\n   3. 後",
	],
] as const) {
	it(`${name}の空項目でEnterして保存・再解析・継続入力しても後続の元の番号を保つ`, async () => {
		const editor = createListEditor(before, "空");
		editor.update(
			() => {
				$getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "空")
					?.setTextContent("")
					.selectEnd();
			},
			{ discrete: true },
		);
		await editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
		editor.update(
			() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection)) selection.insertText("戻った行");
			},
			{ discrete: true },
		);
		const saved = editor.read($convertToMarkdownString);
		expect(rendered(saved)).toEqual(rendered(after));
		const continued = before.includes("後") ? "後" : "戻った行";
		const reopened = createListEditor(saved, continued);
		reopened.update(
			() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection)) selection.insertText("を編集");
			},
			{ discrete: true },
		);
		expect(rendered(reopened.read($convertToMarkdownString))).toEqual(
			rendered(after.replace(continued, `${continued}を編集`)),
		);
	});
}

for (const placement of ["before", "after"] as const) {
	it(`画像だけの段落を子項目の${placement}へ落としても親子の外側で画像を保つ`, () => {
		const picture = "![](https://example.test/image.png)";
		const list = "- 親\n  1. 子\n     - 孫";
		const editor = createListEditor(`${picture}\n\n${list}`, "子");
		editor.update(
			() => {
				const source = $getRoot().getFirstChildOrThrow();
				const target = $getRoot()
					.getAllTextNodes()
					.find((node) => node.getTextContent() === "子")
					?.getParentOrThrow();
				if (!target) throw new Error("子項目がありません");
				const dropTarget = $getBlockDropTarget(
					target.getKey(),
					$isListItemNode(source),
					placement,
				);
				if (!dropTarget) throw new Error("移動先がありません");
				$moveEditorBlock(source.getKey(), dropTarget.getKey(), placement);
			},
			{ discrete: true },
		);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered(
				placement === "before"
					? `${picture}\n\n${list}`
					: `${list}\n\n${picture}`,
			),
		);
	});
}

for (const backward of [false, true]) {
	it(`次の空項目の先頭まで${backward ? "逆向き" : "順向き"}に選んでも空項目の種類を変えない`, async () => {
		const editor = createListEditor("- 対象\n-", "対象");
		editor.update(
			() => {
				const list = $getRoot().getFirstChildOrThrow();
				if (!$isElementNode(list)) throw new Error("リストがありません");
				const first = $getRoot().getAllTextNodes()[0];
				const last = list.getLastChildOrThrow();
				const selection = $createRangeSelection();
				selection.anchor.set(
					(backward ? last : first).getKey(),
					0,
					backward ? "element" : "text",
				);
				selection.focus.set(
					(backward ? first : last).getKey(),
					0,
					backward ? "text" : "element",
				);
				$setSelection(selection);
			},
			{ discrete: true },
		);
		await editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
		expect(rendered(editor.read($convertToMarkdownString))).toEqual(
			rendered("1. 対象\n\n-"),
		);
	});
}
