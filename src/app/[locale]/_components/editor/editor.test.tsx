import { $createCodeNode } from "@lexical/code-core";
import { HorizontalRuleNode } from "@lexical/extension";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { captureException } from "@sentry/react";
import {
	act,
	cleanup,
	createEvent,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import {
	$createParagraphNode,
	$createRangeSelection,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$nodesOfType,
	$setSelection,
	COPY_COMMAND,
	getNearestEditorFromDOMNode,
	INSERT_PARAGRAPH_COMMAND,
	type Klass,
	type LexicalNode,
	PASTE_COMMAND,
	REDO_COMMAND,
	SELECT_ALL_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callReaderAction } from "@/app/_service/reader-action";
import { messages } from "@/i18n/messages";
import { Editor } from "./editor";
import { UPLOAD_IMAGE_COMMAND } from "./image-plugin";
import { ImageNode } from "./media-nodes";
import { HtmlNode } from "./syntax-nodes";

vi.mock("@/app/_service/reader-action", () => ({ callReaderAction: vi.fn() }));
vi.mock("react-tweet", () => ({ Tweet: () => null }));
vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
// 初期の本文を読み込めない場合を再現するため、特定の本文だけ読み込みや読み込み後の変換で失敗させる。
vi.mock("@lexical/mdast", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@lexical/mdast")>();
	const { $getEditor, TextNode } = await import("lexical");
	return {
		...actual,
		$convertFromMarkdownString: (
			...args: Parameters<typeof actual.$convertFromMarkdownString>
		) => {
			if (args[0] === "読み込めない本文") throw new Error("読み込み失敗");
			if (args[0] === "変換で失敗する本文")
				$getEditor().registerNodeTransform(TextNode, () => {
					throw new Error("変換失敗");
				});
			return actual.$convertFromMarkdownString(...args);
		},
	};
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
});
beforeEach(() => {
	vi.clearAllMocks();
	// JSDOMには範囲の配置計測がない。貼り付け内容はこの層で、実際の選択位置はブラウザーで確認する。
	Object.defineProperty(Range.prototype, "getBoundingClientRect", {
		configurable: true,
		value: () => new DOMRect(),
	});
});

describe("Lexicalの本文フォーム", () => {
	it("題名と本文を一つの編集面に置き、Returnで本文へ移り保存値と変更通知を分ける", async () => {
		const onChange = vi.fn();
		const { container, getByTestId } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<form>
					<Editor
						articleTitle={{ defaultValue: "題名", placeholder: "タイトル" }}
						className=""
						defaultValue="**本文**"
						name="pageContent"
						onChange={onChange}
						placeholder="本文"
						showMenus={false}
					/>
				</form>
			</IntlProvider>,
		);
		expect(container.querySelectorAll('[contenteditable="true"]')).toHaveLength(
			1,
		);
		expect(getByTestId("title-input").tagName).toBe("H1");
		const editor = getNearestEditorFromDOMNode(getByTestId("title-input"));
		if (!editor) throw new Error("エディタがありません");
		act(() =>
			editor.update(
				() => {
					const title = $getRoot().getFirstChildOrThrow();
					title.selectEnd().insertText("追記");
					editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
				},
				{ discrete: true },
			),
		);
		expect(editor.read(() => $getSelection()?.getTextContent())).toBe("");
		expect(
			editor.read(() => {
				const selection = $getSelection();
				return (
					$isRangeSelection(selection) &&
					selection.anchor.getNode().getTopLevelElement()?.getType()
				);
			}),
		).toBe("paragraph");
		await waitFor(() => expect(onChange).toHaveBeenCalled());
		const form = container.querySelector("form");
		if (!form) throw new Error("フォームがありません");
		expect(new FormData(form).get("title")).toBe("題名追記");
		expect(new FormData(form).get("pageContent")).toBe("**本文**");
	});
	it("前後のチェック項目から矢印で親へ移動し、Spaceで子リストと親本文を保って切り替える", async () => {
		const editor = renderEditor(
			"- [ ] 前\n- [ ] &#x20;\n\n  - [ ] 子\n\n  親本文\n- [ ] 後",
		);
		const items = editor
			.getRootElement()
			?.querySelectorAll<HTMLElement>('[role="checkbox"]');
		if (items?.length !== 4) throw new Error("チェック項目が足りません");
		items[0].focus();
		await act(async () => {
			fireEvent.keyDown(items[0], { key: "ArrowDown" });
		});
		expect(document.activeElement).toBe(items[1]);
		await act(async () => {
			fireEvent.keyDown(items[1], { key: " ", code: "Space" });
		});
		expect(items[1]).toHaveAttribute("aria-checked", "true");
		expect(items[2]).toHaveAttribute("aria-checked", "false");
		expect(editor.read($convertToMarkdownString)).toContain("親本文");
		for (const index of [2, 3]) {
			await act(async () => {
				fireEvent.keyDown(items[index - 1], { key: "ArrowDown" });
			});
			expect(document.activeElement).toBe(items[index]);
		}
		for (const index of [2, 1, 0]) {
			await act(async () => {
				fireEvent.keyDown(items[index + 1], { key: "ArrowUp" });
			});
			expect(document.activeElement).toBe(items[index]);
		}
	});
	it.each([
		[false, "- コピー親\n  - **子**"],
		[true, "- コピー親\n  - **子**"],
		[false, "- コピー親\n  - **子**\n\n前<br>後\n\n脚注[^n]\n\n[^n]: 注釈"],
		[true, "- コピー親\n  - **子**\n\n前<br>後\n\n脚注[^n]\n\n[^n]: 注釈"],
	] as const)(
		"別の編集欄で内部コピーしたリスト・HTML・脚注で全文を置き換えても階層を増やさない（逆向き=%s、%s）",
		async (backward, markdown) => {
			const source = renderEditor(markdown);
			const expected = source.read($convertToMarkdownString);
			const copied = new Map<string, string>();
			vi.stubGlobal("ClipboardEvent", Event);
			vi.stubGlobal("DragEvent", class extends Event {});
			const copy = new Event("copy", { cancelable: true });
			Object.defineProperty(copy, "clipboardData", {
				value: {
					setData: (type: string, value: string) => copied.set(type, value),
				},
			});
			act(() =>
				source.update(() => $getRoot().selectStart(), { discrete: true }),
			);
			await act(async () => {
				source.dispatchCommand(
					SELECT_ALL_COMMAND,
					new KeyboardEvent("keydown", { key: "a", metaKey: true }),
				);
			});
			await act(async () => {
				source.dispatchCommand(COPY_COMMAND, copy as ClipboardEvent);
			});
			expect(copied.get("application/x-lexical-editor")).toBeTruthy();
			const target = renderEditor("- - 入れ子\n\n  元の本文");
			const before = target.read($convertToMarkdownString);
			act(() =>
				target.update(() => $getRoot().selectStart(), { discrete: true }),
			);
			await act(async () => {
				target.dispatchCommand(
					SELECT_ALL_COMMAND,
					new KeyboardEvent("keydown", { key: "a", metaKey: true }),
				);
				if (backward)
					target.update(
						() => {
							const selection = $getSelection();
							if (!$isRangeSelection(selection))
								throw new Error("選択がありません");
							const { key, offset, type } = selection.anchor;
							selection.anchor.set(
								selection.focus.key,
								selection.focus.offset,
								selection.focus.type,
							);
							selection.focus.set(key, offset, type);
						},
						{ discrete: true },
					);
			});
			const paste = new Event("paste", { cancelable: true });
			Object.defineProperty(paste, "clipboardData", {
				value: {
					files: [],
					types: [...copied.keys()],
					getData: (type: string) => copied.get(type) ?? "",
				},
			});
			await act(async () => {
				target.dispatchCommand(PASTE_COMMAND, paste as ClipboardEvent);
			});
			expect(target.read($convertToMarkdownString)).toBe(expected);
			await act(async () => {
				target.dispatchCommand(UNDO_COMMAND, undefined);
			});
			expect(target.read($convertToMarkdownString)).toBe(before);
			await act(async () => {
				target.dispatchCommand(REDO_COMMAND, undefined);
			});
			expect(target.read($convertToMarkdownString)).toBe(expected);
			const saved = target.read($convertToMarkdownString);
			act(() =>
				target.update(() => $convertFromMarkdownString(saved), {
					discrete: true,
				}),
			);
			expect(target.read($convertToMarkdownString)).toBe(expected);
		},
	);
	it("子リストから始まる親のチェックボックスをクリックしても親本文を保持しUndo/Redoできる", async () => {
		const editor = renderEditor("- [ ] &#x20;\n\n  - 子\n\n  親本文");
		const checkbox = editor
			.getRootElement()
			?.querySelector('[role="checkbox"]');
		if (!checkbox) throw new Error("チェック項目がありません");
		const geometry = vi
			.spyOn(checkbox, "getBoundingClientRect")
			.mockReturnValue(new DOMRect(0, 0, 200, 80));
		const original = window.getComputedStyle.bind(window);
		const styles = vi
			.spyOn(window, "getComputedStyle")
			.mockImplementation((element, pseudo) => {
				if (pseudo !== "::before") return original(element);
				const style = document.createElement("span").style;
				style.width = "20px";
				return style;
			});
		try {
			await act(async () => {
				fireEvent.click(checkbox, { clientX: 8 });
			});
			expect(checkbox).toHaveAttribute("aria-checked", "true");
			const saved = editor.read($convertToMarkdownString);
			expect(saved).toContain("- [x]");
			expect(saved).toContain("子");
			expect(saved).toContain("親本文");
			await act(async () => {
				editor.dispatchCommand(UNDO_COMMAND, undefined);
			});
			expect(
				editor.getRootElement()?.querySelector('[role="checkbox"]'),
			).toHaveAttribute("aria-checked", "false");
			await act(async () => {
				editor.dispatchCommand(REDO_COMMAND, undefined);
			});
			expect(editor.read($convertToMarkdownString)).toBe(saved);
			act(() =>
				editor.update(() => $convertFromMarkdownString(saved), {
					discrete: true,
				}),
			);
			expect(
				editor.getRootElement()?.querySelector('[role="checkbox"]'),
			).toHaveAttribute("aria-checked", "true");
		} finally {
			geometry.mockRestore();
			styles.mockRestore();
		}
	});
	for (const [context, initial] of [
		[
			"入れ子リスト",
			"- - 子A\n\n  本文A\n- - 子B\n\n  本文B\n\n区切り\n\n終端",
		],
		["コードブロック", "```\n古いコード\n```"],
	] as const)
		it.each([
			[false, "text/plain", "- 親A\n  1. 子A\n- 親B", "- 親A\n  1. 子A\n- 親B"],
			[true, "text/plain", "- 親A\n  1. 子A\n- 親B", "- 親A\n  1. 子A\n- 親B"],
			[
				false,
				"text/html",
				"<ul><li>親A<ol><li>子A</li></ol></li><li>親B</li></ul>",
				"- 親A\n  1. 子A\n- 親B",
			],
			[
				true,
				"text/html",
				"<ul><li>親A<ol><li>子A</li></ol></li><li>親B</li></ul>",
				"- 親A\n  1. 子A\n- 親B",
			],
			[false, "text/html", "<b>新しい本文</b>", "**新しい本文**"],
			[true, "text/html", "<b>新しい本文</b>", "**新しい本文**"],
			[
				false,
				"text/html",
				"<b>新しい本文</b><p>次の段落</p>",
				"**新しい本文**\n\n次の段落",
			],
			[
				true,
				"text/html",
				"<b>新しい本文</b><p>次の段落</p>",
				"**新しい本文**\n\n次の段落",
			],
		] as const)(
			`${context}の文書を全選択して貼っても古い階層を引き継がずUndo/Redoできる（逆向き=%s、%s）`,
			async (backward, format, content, expected) => {
				const editor = renderEditor(initial);
				const before = editor.read($convertToMarkdownString);
				await act(async () => {
					editor.dispatchCommand(
						SELECT_ALL_COMMAND,
						new KeyboardEvent("keydown", { key: "a", metaKey: true }),
					);
					if (backward)
						editor.update(() => {
							const selection = $getSelection();
							if (!$isRangeSelection(selection))
								throw new Error("選択がありません");
							const { key, offset, type } = selection.anchor;
							selection.anchor.set(
								selection.focus.key,
								selection.focus.offset,
								selection.focus.type,
							);
							selection.focus.set(key, offset, type);
						});
				});
				const event = new Event("paste", { cancelable: true });
				Object.defineProperty(event, "clipboardData", {
					value: {
						files: [],
						getData: (type: string) => (type === format ? content : ""),
					},
				});
				vi.stubGlobal("ClipboardEvent", Event);
				await act(async () => {
					editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
				});
				expect(editor.read($convertToMarkdownString).trim()).toBe(expected);
				await act(async () => {
					editor.dispatchCommand(UNDO_COMMAND, undefined);
				});
				expect(editor.read($convertToMarkdownString)).toBe(before);
				await act(async () => {
					editor.dispatchCommand(REDO_COMMAND, undefined);
				});
				expect(editor.read($convertToMarkdownString).trim()).toBe(expected);
			},
		);
	it.each([
		[false, "text/plain", "- 親\n  - 子"],
		[true, "text/plain", "- 親\n  - 子"],
		[false, "text/html", "<ul><li>親<ul><li>子</li></ul></li></ul>"],
		[true, "text/html", "<ul><li>親<ul><li>子</li></ul></li></ul>"],
	] as const)(
		"題名を除くコード本文全体を貼り替えてUndo/Redoできる（逆向き=%s、%s）",
		async (backward, format, content) => {
			const { getByTestId } = render(
				<IntlProvider locale="ja" messages={messages.ja}>
					<Editor
						articleTitle={{ defaultValue: "題名", placeholder: "タイトル" }}
						className=""
						defaultValue={"\x60\x60\x60\n古いコード\n\x60\x60\x60"}
						name="content"
						onChange={null}
						placeholder="本文"
						showMenus={false}
					/>
				</IntlProvider>,
			);
			const editor = getNearestEditorFromDOMNode(getByTestId("lexical-editor"));
			if (!editor) throw new Error("エディタがありません");
			const before = editor.read($convertToMarkdownString);
			await act(async () => {
				editor.update(() => {
					const code = $getRoot().getChildren()[1];
					if (!$isElementNode(code)) throw new Error("コードがありません");
					const start = { ...code.selectStart().anchor };
					const end = code.selectEnd().anchor;
					const selection = $createRangeSelection();
					const anchor = backward ? end : start;
					const focus = backward ? start : end;
					selection.anchor.set(anchor.key, anchor.offset, anchor.type);
					selection.focus.set(focus.key, focus.offset, focus.type);
					$setSelection(selection);
				});
			});
			const event = new Event("paste", { cancelable: true });
			Object.defineProperty(event, "clipboardData", {
				value: {
					files: [],
					getData: (type: string) => (type === format ? content : ""),
				},
			});
			vi.stubGlobal("ClipboardEvent", Event);
			await act(async () => {
				editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
			});
			expect(editor.read($convertToMarkdownString)).toBe("- 親\n  - 子");
			expect(getByTestId("title-input")).toHaveTextContent("題名");
			await act(async () => {
				editor.dispatchCommand(UNDO_COMMAND, undefined);
			});
			expect(editor.read($convertToMarkdownString)).toBe(before);
			await act(async () => {
				editor.dispatchCommand(REDO_COMMAND, undefined);
			});
			expect(editor.read($convertToMarkdownString)).toBe("- 親\n  - 子");
		},
	);
	for (const codeBlock of [true, false]) {
		it(`${codeBlock ? "コードブロック" : "インラインコード"}への貼り付けでMarkdown記号を文字として保つ`, async () => {
			const { container } = render(
				<IntlProvider locale="ja" messages={messages.ja}>
					<Editor
						articleTitle={null}
						className=""
						defaultValue=""
						name="content"
						onChange={null}
						placeholder="本文"
						showMenus={false}
					/>
				</IntlProvider>,
			);
			const element = container.querySelector('[contenteditable="true"]');
			if (!element) throw new Error("本文がありません");
			const editor = getNearestEditorFromDOMNode(element);
			if (!editor) throw new Error("エディタがありません");
			act(() =>
				editor.update(
					() => {
						const text = $createTextNode("prefix ");
						if (!codeBlock) text.toggleFormat("code");
						const block = codeBlock
							? $createCodeNode()
							: $createParagraphNode();
						$getRoot().clear().append(block.append(text));
						text.selectEnd().format = text.getFormat();
					},
					{ discrete: true },
				),
			);
			const event = new Event("paste", { cancelable: true });
			Object.defineProperty(event, "clipboardData", {
				value: {
					files: [],
					getData: (type: string) =>
						type === "text/plain" ? 'const pattern = "**foo**";' : "",
				},
			});
			vi.stubGlobal("ClipboardEvent", Event);
			await act(async () => {
				editor.dispatchCommand(PASTE_COMMAND, event as ClipboardEvent);
			});
			expect(
				editor.getEditorState().read(() => $getRoot().getTextContent()),
			).toContain('const pattern = "**foo**";');
		});
	}
	it("編集中にLexicalが操作を拒否しても途中の変更を残さず、記録して次の編集を正しく反映する", () => {
		const editor = renderEditor("本文");
		act(() =>
			editor.update(
				() => {
					$getRoot().append(
						$createParagraphNode().append($createTextNode("途中")),
					);
					throw new Error("拒否");
				},
				{ discrete: true },
			),
		);
		act(() =>
			editor.update(
				() =>
					$getRoot().append(
						$createParagraphNode().append($createTextNode("次")),
					),
				{ discrete: true },
			),
		);
		const text = editor.read(() => $getRoot().getTextContent());
		expect(text).toContain("次");
		expect(text).not.toContain("途中");
		expect(captureException).toHaveBeenCalledWith(
			expect.objectContaining({ message: "拒否" }),
		);
	});
	for (const [markdown, message] of [
		["読み込めない本文", "読み込み失敗"],
		["変換で失敗する本文", "変換失敗"],
	]) {
		it(`初期の本文の${message}では空の編集画面を出さず、画面のエラーにする`, () => {
			const consoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			expect(() => renderEditor(markdown)).toThrow(message);
			consoleError.mockRestore();
		});
	}
	it("文書を開いた直後の初期化だけでは保存を要求しない", async () => {
		const onChange = vi.fn();
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<Editor
					articleTitle={null}
					className=""
					defaultValue={"本文\n"}
					name="content"
					onChange={onChange}
					placeholder="本文"
					showMenus={false}
				/>
			</IntlProvider>,
		);
		await act(async () => {});
		expect(
			container.querySelector('[contenteditable="true"]'),
		).toHaveTextContent("本文");
		expect(onChange).not.toHaveBeenCalled();
	});
	it("連続して編集した最新のMarkdownを送り、再描画でも古い保存結果へ戻さない", async () => {
		const onChange = vi.fn();
		const props = {
			className: "",
			name: "pageContent",
			placeholder: "本文",
			showMenus: false,
			onChange,
		};
		const { container, rerender } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<form>
					<Editor articleTitle={null} {...props} defaultValue="最初の本文" />
				</form>
			</IntlProvider>,
		);
		const editable = container.querySelector('[contenteditable="true"]');
		const form = container.querySelector("form");
		if (!editable || !form) throw new Error("本文フォームがありません");
		const editor = getNearestEditorFromDOMNode(editable);
		if (!editor) throw new Error("エディタがありません");
		act(() =>
			editor.update(() => $convertFromMarkdownString("一回目の編集"), {
				discrete: true,
			}),
		);
		act(() =>
			editor.update(() => $convertFromMarkdownString("二回目の**編集**"), {
				discrete: true,
			}),
		);
		await waitFor(() =>
			expect(new FormData(form).get("pageContent")).toContain(
				"二回目の**編集**",
			),
		);
		rerender(
			<IntlProvider locale="ja" messages={messages.ja}>
				<form>
					<Editor
						articleTitle={null}
						{...props}
						defaultValue="以前の保存結果"
					/>
				</form>
			</IntlProvider>,
		);
		expect(new FormData(form).get("pageContent")).toContain("二回目の**編集**");
		expect(new FormData(form).get("contentFormat")).toBe("markdown");
		expect(onChange).toHaveBeenCalledWith(
			expect.stringContaining("二回目の**編集**"),
		);
	});

	it("画像の送信中は仮画像を本文へ保存せず、完了後に実際のURLへ置き換える", async () => {
		let resolveUpload:
			| ((value: { success: true; data: { imageUrl: string } }) => void)
			| null = null;
		vi.mocked(callReaderAction).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveUpload = resolve;
				}) as never,
		);
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<form>
					<Editor
						articleTitle={null}
						className=""
						defaultValue="本文"
						name="content"
						onChange={null}
						placeholder="本文"
						showMenus={false}
					/>
				</form>
			</IntlProvider>,
		);
		const editable = container.querySelector('[contenteditable="true"]');
		const form = container.querySelector("form");
		if (!editable || !form) throw new Error("本文フォームがありません");
		const editor = getNearestEditorFromDOMNode(editable);
		if (!editor) throw new Error("エディタがありません");
		act(() =>
			editor.update(() => {
				$getRoot().selectEnd();
			}),
		);
		act(() => {
			editor.dispatchCommand(
				UPLOAD_IMAGE_COMMAND,
				new File(["image"], "photo.png", { type: "image/png" }),
			);
		});
		await waitFor(() =>
			expect(
				container.querySelector('img[src^="/loading.gif"]'),
			).not.toBeNull(),
		);
		expect(new FormData(form).get("content")).toBe("本文");
		await act(async () => {
			resolveUpload?.({
				success: true,
				data: { imageUrl: "https://images.evame.tech/uploads/photo.jpg" },
			});
		});
		await waitFor(() =>
			expect(new FormData(form).get("content")).toContain(
				"https://images.evame.tech/uploads/photo.jpg",
			),
		);
		expect(new FormData(form).get("content")).not.toContain("/loading.gif");
	});

	it("保存済みの本文に読み込み中の画像URLが残っていても本文の変更を保存する", async () => {
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<form>
					<Editor
						articleTitle={null}
						className=""
						defaultValue={"![](/loading.gif)\n\n本文"}
						name="content"
						onChange={null}
						placeholder="本文"
						showMenus={false}
					/>
				</form>
			</IntlProvider>,
		);
		const editable = container.querySelector('[contenteditable="true"]');
		const form = container.querySelector("form");
		if (!editable || !form) throw new Error("本文フォームがありません");
		const editor = getNearestEditorFromDOMNode(editable);
		if (!editor) throw new Error("エディタがありません");
		act(() =>
			editor.update(() => {
				$getRoot().getAllTextNodes().at(-1)?.setTextContent("変更後");
			}),
		);
		await waitFor(() =>
			expect(new FormData(form).get("content")).toContain("変更後"),
		);
	});

	it("コメント欄ではTabキーを本文に留めず次の要素へ移動できる", () => {
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<Editor
					articleTitle={null}
					className=""
					defaultValue="本文"
					name="content"
					onChange={null}
					placeholder="本文"
					showMenus={false}
				/>
			</IntlProvider>,
		);
		const editable = container.querySelector('[contenteditable="true"]');
		if (!editable) throw new Error("本文がありません");
		const editor = getNearestEditorFromDOMNode(editable);
		if (!editor) throw new Error("エディタがありません");
		act(() =>
			editor.update(
				() => {
					$getRoot().selectEnd();
				},
				{ discrete: true },
			),
		);
		const event = createEvent.keyDown(editable, { key: "Tab" });
		fireEvent(editable, event);
		expect(event.defaultPrevented).toBe(false);
	});

	it("画像の送信完了後にUndoして編集を続けても本文を保存し、仮画像は保存しない", async () => {
		vi.mocked(callReaderAction).mockResolvedValue({
			success: true,
			data: { imageUrl: "https://images.evame.tech/uploads/photo.jpg" },
		} as never);
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<form>
					<Editor
						articleTitle={null}
						className=""
						defaultValue="本文"
						name="content"
						onChange={null}
						placeholder="本文"
						showMenus={false}
					/>
				</form>
			</IntlProvider>,
		);
		const editable = container.querySelector('[contenteditable="true"]');
		const form = container.querySelector("form");
		if (!editable || !form) throw new Error("本文フォームがありません");
		const editor = getNearestEditorFromDOMNode(editable);
		if (!editor) throw new Error("エディタがありません");
		act(() =>
			editor.update(() => {
				$getRoot().selectEnd();
			}),
		);
		act(() => {
			editor.dispatchCommand(
				UPLOAD_IMAGE_COMMAND,
				new File(["image"], "photo.png", { type: "image/png" }),
			);
		});
		await waitFor(() =>
			expect(new FormData(form).get("content")).toContain("photo.jpg"),
		);
		act(() => {
			editor.dispatchCommand(UNDO_COMMAND, undefined);
		});
		act(() =>
			editor.update(() => {
				$getRoot().getAllTextNodes().at(0)?.setTextContent("変更後");
			}),
		);
		await waitFor(() =>
			expect(new FormData(form).get("content")).toContain("変更後"),
		);
		expect(new FormData(form).get("content")).not.toContain("/loading.gif");
	});

	it("画像の送信失敗時に仮画像を取り除き、再試行できることを伝える", async () => {
		vi.mocked(callReaderAction).mockRejectedValue(new Error("offline"));
		const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
		const { container } = render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<Editor
					articleTitle={null}
					className=""
					defaultValue="本文"
					name="content"
					onChange={null}
					placeholder="本文"
					showMenus={false}
				/>
			</IntlProvider>,
		);
		const editable = container.querySelector('[contenteditable="true"]');
		if (!editable) throw new Error("本文がありません");
		const editor = getNearestEditorFromDOMNode(editable);
		if (!editor) throw new Error("エディタがありません");
		act(() => {
			editor.dispatchCommand(
				UPLOAD_IMAGE_COMMAND,
				new File(["image"], "photo.png", { type: "image/png" }),
			);
		});
		await waitFor(() =>
			expect(alert).toHaveBeenCalledWith(messages.ja.Editor.imageUploadFailed),
		);
		expect(container.querySelector('img[src^="/loading.gif"]')).toBeNull();
		alert.mockRestore();
	});
	for (const [name, typed, trigger, node] of [
		[
			"画像の記法を閉じると画像にする",
			"![説明](https://example.com/a.png",
			")",
			ImageNode,
		],
		[
			"行頭で---の後に空白を入力すると区切り線にする",
			"---",
			" ",
			HorizontalRuleNode,
		],
	] as [string, string, string, Klass<LexicalNode>][]) {
		it(name, async () => {
			const editor = renderEditor("");
			act(() =>
				editor.update(
					() => {
						const paragraph = $createParagraphNode();
						$getRoot().clear().append(paragraph);
						paragraph.select();
					},
					{ discrete: true },
				),
			);
			for (const text of [typed, trigger])
				act(() =>
					editor.update(() => $getSelection()?.insertText(text), {
						discrete: true,
					}),
				);
			expect(editor.read(() => $nodesOfType(node).length)).toBe(1);
		});
	}
	it("行内のHTMLを含む本文をコピーして貼り付けてもHTMLを残す", async () => {
		const editor = renderEditor("前<br>後");
		const copied = new Map<string, string>();
		// jsdomにないクリップボード・ドラッグのイベント型を、Lexicalの型判定用に補う。
		vi.stubGlobal("ClipboardEvent", Event);
		vi.stubGlobal("DragEvent", class extends Event {});
		const copy = new Event("copy", { cancelable: true });
		Object.defineProperty(copy, "clipboardData", {
			value: {
				setData: (type: string, value: string) => copied.set(type, value),
			},
		});
		act(() => {
			editor.update(() => $getRoot().select(0, 1), { discrete: true });
			editor.dispatchCommand(COPY_COMMAND, copy as ClipboardEvent);
			editor.update(
				() => {
					const paragraph = $createParagraphNode();
					$getRoot().clear().append(paragraph);
					paragraph.select();
				},
				{ discrete: true },
			);
		});
		const paste = new Event("paste", { cancelable: true });
		Object.defineProperty(paste, "clipboardData", {
			value: {
				files: [],
				types: [...copied.keys()],
				getData: (type: string) => copied.get(type) ?? "",
			},
		});
		await act(async () => {
			editor.dispatchCommand(PASTE_COMMAND, paste as ClipboardEvent);
		});
		expect(editor.read(() => $nodesOfType(HtmlNode).length)).toBe(1);
		expect(editor.read(() => $getRoot().getTextContent())).toContain("前");
	});
});

function renderEditor(defaultValue: string) {
	const { container } = render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<Editor
				articleTitle={null}
				className=""
				defaultValue={defaultValue}
				name="content"
				onChange={null}
				placeholder="本文"
				showMenus={false}
			/>
		</IntlProvider>,
	);
	const editable = container.querySelector('[contenteditable="true"]');
	if (!editable) throw new Error("本文がありません");
	const editor = getNearestEditorFromDOMNode(editable);
	if (!editor) throw new Error("エディタがありません");
	return editor;
}
