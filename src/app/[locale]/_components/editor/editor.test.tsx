import { $createCodeNode } from "@lexical/code-core";
import { HorizontalRuleNode } from "@lexical/extension";
import { $convertFromMarkdownString } from "@lexical/mdast";
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
	$createTextNode,
	$getRoot,
	$getSelection,
	$nodesOfType,
	COPY_COMMAND,
	getNearestEditorFromDOMNode,
	type Klass,
	type LexicalNode,
	PASTE_COMMAND,
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
});
beforeEach(() => vi.clearAllMocks());

describe("Lexicalの本文フォーム", () => {
	for (const codeBlock of [true, false]) {
		it(`${codeBlock ? "コードブロック" : "インラインコード"}への貼り付けでMarkdown記号を文字として保つ`, async () => {
			const { container } = render(
				<IntlProvider locale="ja" messages={messages.ja}>
					<Editor
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
					<Editor {...props} defaultValue="最初の本文" />
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
					<Editor {...props} defaultValue="以前の保存結果" />
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
