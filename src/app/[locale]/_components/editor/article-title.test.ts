import { buildEditorFromExtensions } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { $isAutoLinkNode } from "@lexical/link";
import { INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	$generateNodesFromMarkdownString,
} from "@lexical/mdast";
import {
	$create,
	$createRangeSelection,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	COMMAND_PRIORITY_HIGH,
	CONTROLLED_TEXT_INSERTION_COMMAND,
	CUT_COMMAND,
	DELETE_CHARACTER_COMMAND,
	DELETE_LINE_COMMAND,
	DELETE_WORD_COMMAND,
	DRAGSTART_COMMAND,
	DROP_COMMAND,
	defineExtension,
	FORMAT_TEXT_COMMAND,
	HISTORY_PUSH_TAG,
	INSERT_PARAGRAPH_COMMAND,
	KEY_ENTER_COMMAND,
	PASTE_COMMAND,
	REDO_COMMAND,
	SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { afterEach, expect, it, vi } from "vitest";
import { ArticleTitleExtension, ArticleTitleNode } from "./article-title";
import { SET_TEXT_BLOCK_COMMAND } from "./block-editing";
import { DocumentExtension } from "./document";

afterEach(() => vi.unstubAllGlobals());

function createArticle(markdown: string) {
	const editor = buildEditorFromExtensions(
		defineExtension({
			name: "article-title-test",
			theme: { tableScrollableWrapper: "overflow-x-auto" },
			dependencies: [
				DocumentExtension,
				HistoryExtension,
				ArticleTitleExtension,
			],
		}),
	);
	editor.update(
		() => {
			$convertFromMarkdownString(markdown);
			$getRoot()
				.getFirstChildOrThrow()
				.insertBefore(
					$create(ArticleTitleNode).append($createTextNode("題名")),
				);
		},
		{ discrete: true },
	);
	return editor;
}

it("先頭H1の題名を本文のMarkdownへ混ぜず、見出しと混在リストを保つ", () => {
	const editor = createArticle("## 本文見出し\n\n- 親\n  - [ ] 子\n\n**本文**");
	expect(editor.read($convertToMarkdownString)).toBe(
		"## 本文見出し\n\n- 親\n  - [ ] 子\n\n**本文**",
	);
	expect(
		editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
	).toBe("題名");
});

it("題名のドラッグと題名へのドロップを拒否して本文を移動しない", () => {
	vi.stubGlobal("DragEvent", class extends Event {});
	const editor = createArticle("本文");
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectStart();
			const drag = new Event("dragstart", { cancelable: true });
			editor.dispatchCommand(DRAGSTART_COMMAND, drag as DragEvent);
			expect(drag.defaultPrevented).toBe(true);
			const drop = new Event("drop", { cancelable: true });
			const heading = document.createElement("h1");
			heading.className = "article-title";
			Object.defineProperty(drop, "target", { value: heading });
			editor.dispatchCommand(DROP_COMMAND, drop as DragEvent);
			expect(drop.defaultPrevented).toBe(true);
		},
		{ discrete: true },
	);
	expect(editor.read($convertToMarkdownString)).toBe("本文");
});

it("題名へ複数行の装飾付き文字を貼っても単一行の文字列にする", () => {
	const editor = createArticle("本文");
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectStart();
			const event = new Event("paste", { cancelable: true });
			Object.defineProperty(event, "clipboardData", {
				value: {
					getData: (type: string) =>
						type === "text/plain" ? "一行\r\n二行\r三行\n四行" : "<b>装飾</b>",
				},
			});
			editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
		},
		{ discrete: true },
	);
	expect(
		editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
	).toBe("一行 二行 三行 四行題名");
	expect(editor.read($convertToMarkdownString)).toBe("本文");
});

it.each(
	[false, true].flatMap((backward) =>
		[false, true].map((rootBoundary) => ({ backward, rootBoundary })),
	),
)(
	"本文全体の貼り替えで題名を残して古いリスト階層を除く（$backward / root=$rootBoundary）",
	({ backward, rootBoundary }) => {
		const editor = createArticle("- 親\n  - 子");
		editor.update(
			() => {
				const first = $getRoot().getChildren()[1];
				const last = $getRoot().getLastChildOrThrow();
				const start = { ...first.selectStart().anchor };
				const end = last.selectEnd().anchor;
				if (rootBoundary) {
					start.key = $getRoot().getKey();
					start.offset = 1;
					start.type = "element";
					end.set($getRoot().getKey(), $getRoot().getChildrenSize(), "element");
				}
				const selection = $createRangeSelection();
				const anchor = backward ? end : start;
				const focus = backward ? start : end;
				selection.anchor.set(anchor.key, anchor.offset, anchor.type);
				selection.focus.set(focus.key, focus.offset, focus.type);
				editor.dispatchCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, {
					nodes: $generateNodesFromMarkdownString("**置換**\n\n- [x] チェック"),
					selection,
				});
			},
			{ discrete: true },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名");
		expect(editor.read($convertToMarkdownString)).toBe(
			"**置換**\n\n- [x] チェック",
		);
	},
);

it.each(
	[DELETE_CHARACTER_COMMAND, DELETE_WORD_COMMAND, DELETE_LINE_COMMAND].flatMap(
		(command) =>
			[false, true].flatMap((backward) =>
				[false, true].map((rootBoundary) => ({
					command,
					backward,
					rootBoundary,
				})),
			),
	),
)(
	"本文全体を削除すると題名を残して空段落へ戻る（$command / $backward / root=$rootBoundary）",
	({ command, backward, rootBoundary }) => {
		const editor = createArticle("- 親\n  - 子");
		editor.update(
			() => {
				const root = $getRoot();
				const selection = $createRangeSelection();
				selection.anchor.set(
					root.getKey(),
					backward ? root.getChildrenSize() : 1,
					"element",
				);
				selection.focus.set(
					root.getKey(),
					backward ? 1 : root.getChildrenSize(),
					"element",
				);
				if (!rootBoundary) {
					const start = { ...root.getChildren()[1].selectStart().anchor };
					const end = root.getLastChildOrThrow().selectEnd().anchor;
					const anchor = backward ? end : start;
					const focus = backward ? start : end;
					selection.anchor.set(anchor.key, anchor.offset, anchor.type);
					selection.focus.set(focus.key, focus.offset, focus.type);
				}
				$setSelection(selection);
				editor.dispatchCommand(command, backward);
			},
			{ discrete: true },
		);
		expect(editor.read($convertToMarkdownString)).toBe("");
		expect(
			editor.read(() =>
				$getRoot()
					.getChildren()
					.map((node) => node.getType()),
			),
		).toEqual(["article-title", "paragraph"]);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名");
	},
);

it.each([false, true])(
	"全文を貼り替えても先頭の画像・混在リストを失わない（逆向き=%s）",
	(backward) => {
		const editor = createArticle("- 元のリスト");
		editor.update(
			() => {
				const root = $getRoot();
				const selection = root.select(
					backward ? root.getChildrenSize() : 0,
					backward ? 0 : root.getChildrenSize(),
				);
				editor.dispatchCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, {
					nodes: $generateNodesFromMarkdownString(
						"![写真](https://example.com/photo.png)\n\n- 親\n  - [x] 子",
					),
					selection,
				});
			},
			{ discrete: true },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("");
		expect(editor.read($convertToMarkdownString)).toBe(
			"![写真](https://example.com/photo.png)\n\n- 親\n  - [x] 子",
		);
	},
);

it.each([false, true])(
	"題名から本文途中まで選んで入力しても選択外の本文を題名へ結合しない（逆向き=%s）",
	(backward) => {
		const editor = createArticle("**前半後半**\n\n## 見出し");
		editor.update(
			() => {
				const title = $getRoot().getFirstDescendant();
				const firstBody = $getRoot().getChildren()[1];
				const body = $isElementNode(firstBody)
					? firstBody.getFirstDescendant()
					: null;
				if (!title || !body) throw new Error("文字がありません");
				const selection = $createRangeSelection();
				selection.anchor.set(
					backward ? body.getKey() : title.getKey(),
					backward ? 2 : 1,
					"text",
				);
				selection.focus.set(
					backward ? title.getKey() : body.getKey(),
					backward ? 1 : 2,
					"text",
				);
				$setSelection(selection);
				editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, "新");
			},
			{ discrete: true },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題新");
		expect(editor.read($convertToMarkdownString)).toBe("**後半**\n\n## 見出し");
	},
);

it.each([0, 1, 2])(
	"題名の位置%sでReturnすると題名を分割せず既存本文の先頭へ進む",
	(offset) => {
		const editor = createArticle("既存本文");
		editor.update(
			() => {
				const title = $getRoot().getFirstDescendant();
				if (!$isTextNode(title)) throw new Error("題名がありません");
				title.select(offset, offset);
				editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
			},
			{ discrete: true },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名");
		expect(
			editor.read(() => {
				const selection = $getSelection();
				return (
					$isRangeSelection(selection) &&
					selection.anchor.getNode().getTextContent()
				);
			}),
		).toBe("既存本文");
	},
);

it("空本文へのReturnで標準段落へ進み、先頭Backspaceで題名に本文を結合しない", () => {
	const editor = createArticle("");
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectEnd();
			editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
			editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
		},
		{ discrete: true },
	);
	expect(
		editor.read(() =>
			$getRoot()
				.getChildren()
				.map((node) => node.getType()),
		),
	).toEqual(["article-title", "paragraph"]);
});

it.each([false, true])(
	"単語削除の移動先が題名と本文を跨いでも元の領域内だけを削除する（逆向き=%s）",
	(backward) => {
		const editor = createArticle("Body text");
		const rootElement = document.createElement("div");
		document.body.append(rootElement);
		editor.setRootElement(rootElement);
		editor.update(
			() => {
				const title = $getRoot().getFirstChildOrThrow();
				if (!(title instanceof ArticleTitleNode))
					throw new Error("題名がありません");
				title.clear().append($createTextNode("Title "));
				const body = $getRoot().getChildren()[1];
				const bodyText = $isElementNode(body)
					? body.getFirstDescendant()
					: null;
				if (!$isTextNode(bodyText)) throw new Error("本文がありません");
				bodyText.setTextContent(backward ? " Body text" : "Body text");
			},
			{ discrete: true },
		);
		const titleText = rootElement.querySelector("h1 span")?.firstChild;
		const bodyText = rootElement.querySelector("p span")?.firstChild;
		if (!titleText || !bodyText) throw new Error("削除する文字がありません");
		const domSelection = window.getSelection();
		if (!domSelection) throw new Error("選択がありません");
		Object.defineProperty(domSelection, "modify", {
			configurable: true,
			value: () =>
				domSelection.setBaseAndExtent(
					backward ? titleText : bodyText,
					backward ? 0 : 5,
					backward ? titleText : bodyText,
					backward ? 0 : 5,
				),
		});
		try {
			editor.update(
				() => {
					const root = $getRoot();
					const block = root.getChildren()[backward ? 1 : 0];
					const text = $isElementNode(block)
						? block.getFirstDescendant()
						: null;
					if (!$isTextNode(text)) throw new Error("文字がありません");
					text.select(backward ? 1 : 5, backward ? 1 : 5);
					editor.dispatchCommand(DELETE_WORD_COMMAND, backward);
				},
				{ discrete: true },
			);
			expect(
				editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
			).toBe(backward ? "Title " : "Title");
			expect(editor.read($convertToMarkdownString)).toBe("Body text");
		} finally {
			Reflect.deleteProperty(domSelection, "modify");
			editor.setRootElement(null);
			rootElement.remove();
		}
	},
);

it("日本語の確定中のReturnでは本文へ移らず、確定後に移れる", () => {
	const editor = createArticle("本文");
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectEnd();
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				isComposing: true,
				cancelable: true,
			});
			editor.dispatchCommand(KEY_ENTER_COMMAND, event);
			expect(
				$getSelection()
					?.getNodes()
					.every(
						(node) =>
							node instanceof ArticleTitleNode ||
							node.getTopLevelElement() instanceof ArticleTitleNode,
					),
			).toBe(true);
			expect(event.defaultPrevented).toBe(false);
			editor.dispatchCommand(
				KEY_ENTER_COMMAND,
				new KeyboardEvent("keydown", { key: "Enter" }),
			);
			expect(
				$getSelection()
					?.getNodes()
					.every(
						(node) =>
							!(node instanceof ArticleTitleNode) &&
							!(node.getTopLevelElement() instanceof ArticleTitleNode),
					),
			).toBe(true);
		},
		{ discrete: true },
	);
});

it.each(["```\ncode\n```", "## ", "> 引用", "- 項目"])(
	"本文先頭の%sでBackspaceを押すと題名へ結合せずブロックを解除する",
	(markdown) => {
		const editor = createArticle(markdown);
		const original = editor.read(() =>
			$getRoot().getChildren()[1].getTextContent(),
		);
		editor.update(
			() => {
				$getRoot().getChildren()[1].selectStart();
				editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
			},
			{ discrete: true },
		);
		expect(editor.read(() => $getRoot().getChildren()[1].getType())).toBe(
			"paragraph",
		);
		expect(
			editor.read(() => $getRoot().getChildren()[1].getTextContent()),
		).toBe(original);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名");
	},
);

it.each([
	["paste", false],
	["paste", true],
	["beforeinput", false],
	["beforeinput", true],
	["beforeinput-paste", false],
	["beforeinput-paste", true],
] as const)(
	"題名からコード途中への%s貼り付けで選択外のコードを本文に残す（逆向き=%s）",
	(kind, backward) => {
		const editor = createArticle("\x60\x60\x60\nabcdef\n\x60\x60\x60\n\nlast");
		editor.registerCommand(
			PASTE_COMMAND,
			() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return false;
				selection.insertRawText("X");
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
		editor.update(
			() => {
				const title = $getRoot().getFirstChildOrThrow();
				if (!(title instanceof ArticleTitleNode))
					throw new Error("題名がありません");
				title.clear().append($createTextNode("Title"));
				const titleText = title.getFirstDescendant();
				const code = $getRoot().getChildren()[1];
				const codeText = $isElementNode(code)
					? code.getFirstDescendant()
					: null;
				if (!titleText || !codeText) throw new Error("選択対象がありません");
				const selection = $createRangeSelection();
				selection.anchor.set(
					backward ? codeText.getKey() : titleText.getKey(),
					backward ? 3 : 2,
					"text",
				);
				selection.focus.set(
					backward ? titleText.getKey() : codeText.getKey(),
					backward ? 2 : 3,
					"text",
				);
				$setSelection(selection);
				const clipboard = {
					getData: (type: string) => (type === "text/plain" ? "X" : ""),
				};
				if (kind === "paste") {
					const event = new Event("paste", { cancelable: true });
					Object.defineProperty(event, "clipboardData", { value: clipboard });
					editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
					expect(event.defaultPrevented).toBe(true);
				} else {
					const event = new InputEvent("beforeinput", {
						inputType: "insertFromPaste",
						cancelable: true,
					});
					Object.defineProperty(event, "dataTransfer", { value: clipboard });
					if (kind === "beforeinput-paste") {
						editor.dispatchCommand(PASTE_COMMAND, event);
						expect(event.defaultPrevented).toBe(true);
					} else
						editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, event);
				}
			},
			{ discrete: true },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("TiX");
		expect(editor.read($convertToMarkdownString)).toBe(
			"\x60\x60\x60\ndef\n\x60\x60\x60\n\nlast",
		);
	},
);

it("題名へのInputEvent貼り付けも改行と書式を除いて本文を保つ", () => {
	const editor = createArticle("本文");
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectStart();
			const event = new InputEvent("beforeinput", {
				inputType: "insertFromPaste",
			});
			Object.defineProperty(event, "dataTransfer", {
				value: {
					getData: (type: string) =>
						type === "text/plain"
							? "一行\n二行"
							: "<p><b>一行</b></p><p>二行</p>",
				},
			});
			editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, event);
		},
		{ discrete: true },
	);
	expect(
		editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
	).toBe("一行 二行題名");
	expect(editor.read($convertToMarkdownString)).toBe("本文");
});

it.each([false, true])(
	"題名から本文の途中まで切り取っても選択外の本文と書式を残す（逆向き=%s）",
	(backward) => {
		const editor = createArticle("**前半後半**\n\n## 見出し");
		const clipboard = new Map<string, string>();
		editor.update(
			() => {
				const title = $getRoot().getFirstDescendant();
				const firstBody = $getRoot().getChildren()[1];
				const body = $isElementNode(firstBody)
					? firstBody.getFirstDescendant()
					: null;
				if (!title || !body) throw new Error("文字がありません");
				const selection = $createRangeSelection();
				selection.anchor.set(
					backward ? body.getKey() : title.getKey(),
					backward ? 2 : 1,
					"text",
				);
				selection.focus.set(
					backward ? title.getKey() : body.getKey(),
					backward ? 1 : 2,
					"text",
				);
				$setSelection(selection);
				const event = new Event("cut", { cancelable: true });
				Object.defineProperty(event, "clipboardData", {
					value: {
						setData: (type: string, value: string) =>
							clipboard.set(type, value),
					},
				});
				editor.dispatchCommand(CUT_COMMAND, event as ClipboardEvent);
				expect(event.defaultPrevented).toBe(true);
			},
			{ discrete: true },
		);
		expect(clipboard.get("text/plain")).toContain("名");
		expect(clipboard.get("text/plain")).toContain("前半");
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題");
		expect(editor.read($convertToMarkdownString)).toBe("**後半**\n\n## 見出し");
	},
);

it.each([false, true])(
	"題名と本文を全文選択して入力すると古いリストを除き、Undoで全体を復元する（逆向き=%s）",
	async (backward) => {
		const editor = createArticle("- 親\n  - [x] 子");
		editor.update(
			() => {
				const root = $getRoot();
				root.select(
					backward ? root.getChildrenSize() : 0,
					backward ? 0 : root.getChildrenSize(),
				);
				editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, "新しい題名");
			},
			{ discrete: true, tag: HISTORY_PUSH_TAG },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("新しい題名");
		expect(editor.read($convertToMarkdownString)).toBe("");
		await editor.dispatchCommand(UNDO_COMMAND, undefined);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名");
		expect(editor.read($convertToMarkdownString)).toBe("- 親\n  - [x] 子");
	},
);

it.each([false, true])(
	"全文選択へのInputEvent貼り付けでも題名と装飾付き本文を失わない（逆向き=%s）",
	(backward) => {
		const editor = createArticle("- 古い本文");
		editor.update(
			() => {
				const root = $getRoot();
				root.select(
					backward ? root.getChildrenSize() : 0,
					backward ? 0 : root.getChildrenSize(),
				);
				const event = new InputEvent("beforeinput", {
					inputType: "insertFromPaste",
				});
				Object.defineProperty(event, "dataTransfer", {
					value: {
						getData: (type: string) =>
							type === "text/html"
								? "<h1>差し替え題名</h1><p><strong>差し替え本文</strong></p>"
								: "",
					},
				});
				editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, event);
			},
			{ discrete: true },
		);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("差し替え題名");
		expect(editor.read($convertToMarkdownString)).toBe("**差し替え本文**");
	},
);

it.each([
	"--- ",
	"*** ",
	"**強調**",
	"[リンク](https://example.test)",
	"https://example.test",
])("題名へ%sを入力しても記号やURLを変換せず文字列で保持する", async (text) => {
	const editor = createArticle("本文");
	editor.update(
		() => {
			const title = $getRoot().getFirstChildOrThrow();
			if (!(title instanceof ArticleTitleNode))
				throw new Error("題名がありません");
			title.clear().selectStart();
		},
		{ discrete: true },
	);
	for (const character of text) {
		editor.update(
			() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection)) selection.insertText(character);
			},
			{ discrete: true },
		);
		await Promise.resolve();
	}
	expect(
		editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
	).toBe(text);
	expect(editor.read($convertToMarkdownString)).toBe("本文");
});

it.each([
	["**本文**", "**本文**"],
	["--- ", "***\n"],
	["https://example.test", "https\\://example.test"],
])(
	"題名と本文を行き来しても本文の記法入力%sは変換できる",
	async (text, expected) => {
		const editor = createArticle("");
		editor.update(
			() => {
				$getRoot().getFirstChildOrThrow().selectEnd();
			},
			{ discrete: true },
		);
		editor.update(
			() => {
				$getRoot().getChildren()[1]?.selectStart();
			},
			{ discrete: true },
		);
		for (const character of text) {
			editor.update(
				() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) selection.insertText(character);
				},
				{ discrete: true },
			);
			await Promise.resolve();
		}
		expect(editor.read($convertToMarkdownString)).toBe(expected);
		if (text.startsWith("https://"))
			expect(
				editor.read(() => {
					const body = $getRoot().getChildren()[1];
					return $isElementNode(body) && $isAutoLinkNode(body.getFirstChild());
				}),
			).toBe(true);
		expect(
			editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
		).toBe("題名");
	},
);

it("題名を選択して見出し・リスト・太字を指定してもH1の文字列のまま保つ", () => {
	const editor = createArticle("本文");
	editor.update(
		() => {
			$getRoot().getFirstChildOrThrow().selectStart();
			editor.dispatchCommand(SET_TEXT_BLOCK_COMMAND, "h2");
			editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
		},
		{ discrete: true },
	);
	expect(editor.read(() => $getRoot().getFirstChildOrThrow().getType())).toBe(
		"article-title",
	);
	expect(editor.read($convertToMarkdownString)).toBe("本文");
});

it("題名と本文を同じ履歴でUndo・Redoしても保存先を分けたまま戻せる", async () => {
	const editor = createArticle("本文");
	editor.update(
		() => {
			const title = $getRoot().getFirstChildOrThrow();
			if (!(title instanceof ArticleTitleNode))
				throw new Error("題名がありません");
			title.append($createTextNode("追記"));
		},
		{ discrete: true, tag: HISTORY_PUSH_TAG },
	);
	await editor.dispatchCommand(UNDO_COMMAND, undefined);
	expect(
		editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
	).toBe("題名");
	await editor.dispatchCommand(REDO_COMMAND, undefined);
	expect(
		editor.read(() => $getRoot().getFirstChildOrThrow().getTextContent()),
	).toBe("題名追記");
	expect(editor.read($convertToMarkdownString)).toBe("本文");
});
