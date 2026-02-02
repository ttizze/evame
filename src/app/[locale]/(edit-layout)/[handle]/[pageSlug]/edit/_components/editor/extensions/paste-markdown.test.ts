import { Editor } from "@tiptap/core";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import { Slice } from "@tiptap/pm/model";
import { StarterKit } from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import {
	markdownToHtml,
	PasteMarkdown,
	shouldUseHtmlForMarkdown,
} from "./paste-markdown";

describe("paste-markdown", () => {
	it("脚注が含まれる場合はHTML経由の貼り付け判定になる", () => {
		const markdown = "本文[^1]\n\n[^1]: 脚注";
		expect(shouldUseHtmlForMarkdown(markdown)).toBe(true);
	});

	it("タスクリストのみの貼り付けはMarkdown挿入判定になる", () => {
		const markdown = "- [ ] Task one\n- [x] Task two";
		expect(shouldUseHtmlForMarkdown(markdown)).toBe(false);
	});

	it("脚注付きMarkdownはHTMLに変換できる", () => {
		const markdown = "脚注テスト[^1]\n\n[^1]: 脚注本文";
		const html = markdownToHtml(markdown);
		expect(html).toContain("footnotes");
	});

	it("貼り付け時に脚注がないMarkdownはタスクとして挿入される", () => {
		const editor = new Editor({
			content: "",
			extensions: [
				StarterKit,
				TaskList,
				TaskItem,
				Markdown.configure({
					markedOptions: {
						gfm: true,
						breaks: false,
					},
				}),
				PasteMarkdown,
			],
		});

		const event = {
			clipboardData: {
				getData: () => "- [ ] Task one\n- [x] Task two",
			},
		} as unknown as ClipboardEvent;

		editor.view.someProp("handlePaste", (handler) =>
			handler(editor.view, event, Slice.empty),
		);

		const html = editor.getHTML();
		expect(html).toContain('data-type="taskList"');
		expect(html).toContain('data-type="taskItem"');
		expect(html).not.toContain("footnotes");

		editor.destroy();
	});

	it("貼り付け時に脚注があるMarkdownはHTMLとして挿入される", () => {
		const editor = new Editor({
			content: "",
			extensions: [
				StarterKit,
				TaskList,
				TaskItem,
				Markdown.configure({
					markedOptions: {
						gfm: true,
						breaks: false,
					},
				}),
				PasteMarkdown,
			],
		});

		const event = {
			clipboardData: {
				getData: () => "本文[^1]\n\n[^1]: 脚注",
			},
		} as unknown as ClipboardEvent;

		editor.view.someProp("handlePaste", (handler) =>
			handler(editor.view, event, Slice.empty),
		);

		const html = editor.getHTML();
		expect(html).toContain("Footnotes");
		expect(html).toContain("data-footnote-backref");

		editor.destroy();
	});
});
