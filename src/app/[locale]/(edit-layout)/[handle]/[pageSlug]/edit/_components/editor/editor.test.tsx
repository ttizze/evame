import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Editor } from "./editor";

const { editor, useEditor } = vi.hoisted(() => {
	let html = "<p>最初の段落</p>";
	return {
		editor: {
			getHTML: vi.fn(() => html),
			setHTML: (nextHtml: string) => {
				html = nextHtml;
			},
		},
		useEditor: vi.fn(),
	};
});

vi.mock("@tiptap/react", () => ({
	EditorContent: () => null,
	useEditor,
}));

vi.mock("./editor-config", () => ({
	configureEditor: () => ({ editorProps: {} }),
}));

describe("Editor", () => {
	it("更新ごとにhidden inputへ最新のHTMLを反映する", () => {
		useEditor.mockReturnValue(editor);
		render(
			<Editor
				className=""
				defaultValue="<p>最初の段落</p>"
				name="pageContent"
				placeholder=""
				showMenus={false}
			/>,
		);

		const options = useEditor.mock.calls[0][0];
		act(() => {
			options.onCreate({ editor });
		});
		expect(screen.getByDisplayValue("<p>最初の段落</p>")).toBeInTheDocument();

		editor.setHTML("<p>保存する最後の段落</p>");
		act(() => {
			options.onUpdate({ editor });
		});

		expect(
			screen.getByDisplayValue("<p>保存する最後の段落</p>"),
		).toBeInTheDocument();
	});
});
