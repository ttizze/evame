import { act, render, waitFor } from "@testing-library/react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import { Editor } from "./editor";

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("./use-file-upload", () => ({
	uploadEditorImage: vi.fn(),
	handleFileUpload: vi.fn(),
}));
vi.mock("react-tweet", () => ({ Tweet: () => null }));

describe("Tiptap本文のフォーム送信", () => {
	it("親が再描画されなくても連続した編集後の最新本文を送信する", async () => {
		let editor: TiptapEditor | null = null;
		const { container, rerender } = render(
			<form>
				<Editor
					className=""
					defaultValue="<p>最初の本文</p>"
					name="pageContent"
					onEditorCreate={(createdEditor) => {
						editor = createdEditor;
					}}
					placeholder="本文"
					showMenus={false}
				/>
			</form>,
		);
		await waitFor(() => expect(editor).not.toBeNull());
		const form = container.querySelector("form");
		if (!form || !editor) throw new Error("エディターが初期化されていません");
		act(() => {
			editor?.commands.setContent("<p>一回目の編集</p>");
		});
		act(() => {
			editor?.commands.setContent("<p>二回目の編集</p>");
		});
		expect(new FormData(form).get("pageContent")).toBe("<p>二回目の編集</p>");
		rerender(
			<form>
				<Editor
					className=""
					defaultValue="<p>以前の保存結果</p>"
					name="pageContent"
					placeholder="本文"
					showMenus={false}
				/>
			</form>,
		);
		expect(new FormData(form).get("pageContent")).toBe("<p>二回目の編集</p>");
	});
});
