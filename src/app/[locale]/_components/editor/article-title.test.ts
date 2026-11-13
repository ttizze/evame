import { buildEditorFromExtensions } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import {
	$createRangeSelection,
	$createTextNode,
	$getRoot,
	$isElementNode,
	$isTextNode,
	$setSelection,
	CONTROLLED_TEXT_INSERTION_COMMAND,
	DELETE_CHARACTER_COMMAND,
	defineExtension,
	HISTORY_PUSH_TAG,
	INSERT_LINE_BREAK_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	PASTE_COMMAND,
	REDO_COMMAND,
	REMOVE_TEXT_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArticleTitleExtension } from "./article-title";
import { SET_TEXT_BLOCK_COMMAND } from "./block-editing";
import { DocumentExtension } from "./document";

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
	vi.stubGlobal("DragEvent", class extends Event {});
	vi.stubGlobal("ClipboardEvent", Event);
});

function createArticle(markdown: string, article: boolean) {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "article-title-test",
			theme: { tableScrollableWrapper: "overflow-x-auto" },
			dependencies: [
				DocumentExtension,
				HistoryExtension,
				...(article ? [ArticleTitleExtension] : []),
			],
		}),
	);
	editor.update(
		() => {
			$convertFromMarkdownString(markdown);
			$getRoot()
				.getFirstChildOrThrow()
				.insertBefore($createHeadingNode("h1").append($createTextNode("題名")));
		},
		{ discrete: true },
	);
	return editor;
}

it("題名には専用ノードを作らず標準のHeadingNodeを使い、本文だけをMarkdownに保存する", () => {
	const editor = createArticle("## 本文\n\n- 親\n  - 子", true);
	editor.read(() => {
		const title = $getRoot().getFirstChildOrThrow();
		expect($isHeadingNode(title)).toBe(true);
		expect($isHeadingNode(title) && title.getTag()).toBe("h1");
		expect(title.getTextContent()).toBe("題名");
		expect($convertToMarkdownString()).toBe("## 本文\n\n- 親\n  - 子");
	});
});

it.each([
	"# 画像入り ![写真](https://example.com/photo.png)",
	"# リンク付き [![写真](https://example.com/photo.png)](https://example.com/page)",
])(
	"先頭の見出しに画像が含まれる場合も本文として保存して内容を落とさない（%s）",
	(markdown) => {
		const editor = createArticle(markdown, true);
		editor.update(() => $getRoot().getFirstChildOrThrow().remove(), {
			discrete: true,
		});
		expect(editor.read($convertToMarkdownString)).toBe(markdown);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("");
	},
);

it.each(
	[0, 1, 2].flatMap((offset) =>
		[false, true].map((soft) => ({ offset, soft })),
	),
)(
	"題名の改行は標準の見出しと同じ結果になり、先頭だけH1に保つ（位置=$offset / Shift=$soft）",
	({ offset, soft }) => {
		const editors = [createArticle("本文", false), createArticle("本文", true)];
		for (const editor of editors) {
			editor.update(
				() => {
					const title = $getRoot().getFirstChildOrThrow();
					const text = $isElementNode(title)
						? title.getFirstDescendant()
						: null;
					if (!$isTextNode(text)) throw new Error("題名がありません");
					text.select(offset, offset);
					if (soft) editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
					else editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
				},
				{ discrete: true },
			);
		}
		const standard = editors[0].getEditorState().toJSON().root.children;
		const article = editors[1].getEditorState().toJSON().root.children;
		if (!("children" in standard[0]))
			throw new Error("標準の見出しがありません");
		expect(article.slice(1)).toEqual(standard.slice(1));
		expect(article[0]).toMatchObject({
			type: "heading",
			tag: "h1",
			children: standard[0].children,
		});
	},
);

it.each([false, true])(
	"題名と本文の結合は標準のBackspace・Deleteと同じ結果になり、Undo/Redoできる（逆向き=%s）",
	async (backward) => {
		const editors = [createArticle("本文", false), createArticle("本文", true)];
		for (const editor of editors) {
			editor.update(
				() => {
					const root = $getRoot();
					if (backward) root.getChildren()[1].selectStart();
					else root.getFirstChildOrThrow().selectEnd();
					editor.dispatchCommand(DELETE_CHARACTER_COMMAND, backward);
				},
				{ discrete: true, tag: HISTORY_PUSH_TAG },
			);
		}
		expect(editors[1].getEditorState().toJSON()).toEqual(
			editors[0].getEditorState().toJSON(),
		);
		expect(
			editors[1].read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名本文");
		expect(editors[1].read($convertToMarkdownString)).toBe("");
		await editors[1].dispatchCommand(UNDO_COMMAND, undefined);
		expect(editors[1].read($convertToMarkdownString)).toBe("本文");
		await editors[1].dispatchCommand(REDO_COMMAND, undefined);
		expect(editors[1].getEditorState().toJSON()).toEqual(
			editors[0].getEditorState().toJSON(),
		);
	},
);

it.each(
	[false, true].flatMap((backward) =>
		["削除", "入力", "貼り付け"].map((operation) => ({ backward, operation })),
	),
)(
	"題名とコードをまたぐ選択の編集を標準と同じ処理へ任せる（$operation / 逆向き=$backward）",
	async ({ backward, operation }) => {
		const editors = [
			createArticle(
				"先行段落\n\n\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast",
				false,
			),
			createArticle(
				"先行段落\n\n\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast",
				true,
			),
		];
		for (const editor of editors) {
			editor.update(
				() => {
					const root = $getRoot();
					const title = root.getFirstDescendant();
					const code = root.getChildren()[2];
					const codeText = $isElementNode(code)
						? code.getFirstDescendant()
						: null;
					if (!title || !codeText) throw new Error("選択対象がありません");
					const selection = $createRangeSelection();
					selection.anchor.set(
						backward ? codeText.getKey() : title.getKey(),
						backward ? 3 : 1,
						"text",
					);
					selection.focus.set(
						backward ? title.getKey() : codeText.getKey(),
						backward ? 1 : 3,
						"text",
					);
					$setSelection(selection);
					if (operation === "削除")
						editor.dispatchCommand(REMOVE_TEXT_COMMAND, null);
					else if (operation === "入力")
						editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, "X");
					else {
						const event = new Event("paste", { cancelable: true });
						Object.defineProperty(event, "clipboardData", {
							value: {
								files: [],
								types: ["text/plain"],
								getData: (type: string) => (type === "text/plain" ? "X" : ""),
							},
						});
						editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
					}
				},
				{ discrete: true },
			);
			await Promise.resolve();
		}
		expect(editors[1].getEditorState().toJSON()).toEqual(
			editors[0].getEditorState().toJSON(),
		);
	},
);

it.each([false, true])(
	"装飾付きHTMLの全文貼り替えを標準へ任せ、先頭行をH1の題名として保存する（逆向き=%s）",
	async (backward) => {
		const editor = createArticle("- 古い親\n  - 子", true);
		editor.update(
			() => {
				const root = $getRoot();
				root.select(
					backward ? root.getChildrenSize() : 0,
					backward ? 0 : root.getChildrenSize(),
				);
				const event = new Event("paste", { cancelable: true });
				Object.defineProperty(event, "clipboardData", {
					value: {
						files: [],
						types: ["text/html"],
						getData: (type: string) =>
							type === "text/html"
								? "<h2>新しい題名</h2><p><strong>A</strong><em>B</em></p><p>last</p>"
								: "",
					},
				});
				editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
			},
			{ discrete: true, tag: HISTORY_PUSH_TAG },
		);
		await Promise.resolve();
		editor.read(() => {
			const title = $getRoot().getFirstChildOrThrow();
			expect($isHeadingNode(title) && title.getTag()).toBe("h1");
			expect(title.getTextContent()).toBe("新しい題名");
			expect(
				$getRoot()
					.getChildren()
					.slice(1)
					.map((node) => node.getTextContent()),
			).toEqual(["AB", "last"]);
		});
		const markdown = editor.read($convertToMarkdownString);
		await editor.dispatchCommand(UNDO_COMMAND, undefined);
		expect(editor.read($convertToMarkdownString)).toBe("- 古い親\n  - 子");
		await editor.dispatchCommand(REDO_COMMAND, undefined);
		expect(editor.read($convertToMarkdownString)).toBe(markdown);
	},
);

it("題名の書式メニューから本文用の見出しを選んでも先頭H1を保つ", () => {
	const editor = createArticle("本文", true);
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectStart();
			editor.dispatchCommand(SET_TEXT_BLOCK_COMMAND, "h2");
		},
		{ discrete: true },
	);
	expect(
		editor.read(() => {
			const first = $getRoot().getFirstChildOrThrow();
			return $isHeadingNode(first) && first.getTag();
		}),
	).toBe("h1");
});
