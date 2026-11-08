import { $createCodeNode } from "@lexical/code-core";
import { $convertFromMarkdownString } from "@lexical/mdast";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	getNearestEditorFromDOMNode,
	PASTE_COMMAND,
} from "lexical";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callReaderAction } from "@/app/_service/reader-action";
import { messages } from "@/i18n/messages";
import { Editor } from "./editor";
import { UPLOAD_IMAGE_COMMAND } from "./image-plugin";

vi.mock("@/app/_service/reader-action", () => ({ callReaderAction: vi.fn() }));
vi.mock("react-tweet", () => ({ Tweet: () => null }));

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
			expect(container.querySelector('img[src="/loading.gif"]')).not.toBeNull(),
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
		expect(container.querySelector('img[src="/loading.gif"]')).toBeNull();
		alert.mockRestore();
	});
});
