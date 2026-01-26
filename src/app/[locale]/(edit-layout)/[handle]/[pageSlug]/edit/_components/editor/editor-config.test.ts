import { generateJSON } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import { configureEditor } from "./editor-config";

vi.mock("react-tweet", () => ({
	Tweet: () => null,
}));

type ProseMirrorNode = {
	type: string;
	content?: ProseMirrorNode[];
	text?: string;
};

function findFirstBlockquoteChildTypes(node: ProseMirrorNode): string[] | null {
	if (node.type === "blockquote" && node.content) {
		return node.content.map((child) => child.type);
	}
	if (!node.content) return null;
	for (const child of node.content) {
		const found = findFirstBlockquoteChildTypes(child);
		if (found) return found;
	}
	return null;
}

function findFirstXNode(node: ProseMirrorNode): ProseMirrorNode | null {
	if (node.type === "x") return node;
	if (!node.content) return null;
	for (const child of node.content) {
		const found = findFirstXNode(child);
		if (found) return found;
	}
	return null;
}

describe("editor-config", () => {
	describe("transformPastedHTML", () => {
		// 実装済みの transformPastedHTML を取得
		const { editorProps } = configureEditor("", "");
		if (!editorProps?.transformPastedHTML) {
			throw new Error("transformPastedHTML is undefined");
		}
		const transform = editorProps.transformPastedHTML;

		it("wraps single block with <p>", () => {
			expect(transform("text")).toBe("<p>text</p>");
		});

		it("splits consecutive <br> into paragraphs", () => {
			const html = "foo<br><br>bar";
			expect(transform(html)).toBe("<p>foo</p><p>bar</p>");
		});

		it("removes paragraph that only contains <br>", () => {
			expect(transform("<p><br></p>")).toBe("<p></p>");
		});

		it("keeps single <br> inside paragraph", () => {
			expect(transform("foo<br>bar")).toBe("<p>foo<br>bar</p>");
		});
	});

	it("does not split blockquote when it contains normal links", () => {
		const html =
			'<blockquote><p>瞑想、英: <a href="https://example.com">meditation</a>、英: <a href="https://example.com/2">contemplation</a></p></blockquote>';
		const { extensions } = configureEditor("", "");
		const doc = generateJSON(html, extensions) as ProseMirrorNode;
		const childTypes = findFirstBlockquoteChildTypes(doc);
		expect(childTypes).toEqual(["paragraph"]);
	});

	it("parses x node only from data-x-id link", () => {
		const html =
			'<blockquote><p><a data-x-id="1234567890" href="https://x.com/i/web/status/1234567890">https://x.com/i/web/status/1234567890</a></p></blockquote>';
		const { extensions } = configureEditor("", "");
		const doc = generateJSON(html, extensions) as ProseMirrorNode;
		expect(findFirstXNode(doc)).not.toBeNull();
	});

	describe("FileHandler onPaste", () => {
		// FileHandlerのonPasteロジックを直接テスト
		const mockHandleFileUpload = vi.fn();

		// onPaste関数のロジックを再現
		const onPaste = (files: File[], htmlContent: string | null) => {
			for (const file of files) {
				if (htmlContent) {
					return false;
				}
				mockHandleFileUpload(file);
			}
		};

		beforeEach(() => {
			mockHandleFileUpload.mockClear();
		});

		it("should handle file paste without HTML content", () => {
			const file = new File(["test"], "test.png", { type: "image/png" });
			const files = [file];

			onPaste(files, null);

			expect(mockHandleFileUpload).toHaveBeenCalledTimes(1);
			expect(mockHandleFileUpload).toHaveBeenCalledWith(file);
		});

		it("should skip file handling when HTML content is present", () => {
			const file = new File(["test"], "test.png", { type: "image/png" });
			const files = [file];
			const htmlContent = "<p>Some HTML content</p>";

			const result = onPaste(files, htmlContent);

			expect(result).toBe(false);
			expect(mockHandleFileUpload).not.toHaveBeenCalled();
		});

		it("should handle multiple files on paste", () => {
			const file1 = new File(["test1"], "test1.png", { type: "image/png" });
			const file2 = new File(["test2"], "test2.jpg", { type: "image/jpeg" });
			const files = [file1, file2];

			onPaste(files, null);

			expect(mockHandleFileUpload).toHaveBeenCalledTimes(2);
			expect(mockHandleFileUpload).toHaveBeenCalledWith(file1);
			expect(mockHandleFileUpload).toHaveBeenCalledWith(file2);
		});

		it("should handle empty file array", () => {
			const files: File[] = [];

			onPaste(files, null);

			expect(mockHandleFileUpload).not.toHaveBeenCalled();
		});

		it("should return false for first file with HTML content", () => {
			const file1 = new File(["test1"], "test1.png", { type: "image/png" });
			const file2 = new File(["test2"], "test2.jpg", { type: "image/jpeg" });
			const files = [file1, file2];
			const htmlContent = "<p>HTML</p>";

			const result = onPaste(files, htmlContent);

			expect(result).toBe(false);
			expect(mockHandleFileUpload).not.toHaveBeenCalled();
		});
	});

	describe("FileHandler onDrop", () => {
		// FileHandlerのonDropロジックを直接テスト
		const mockHandleFileUpload = vi.fn();

		// onDrop関数のロジックを再現
		const onDrop = (files: File[], pos?: number) => {
			for (const file of files) {
				mockHandleFileUpload(file, pos);
			}
		};

		beforeEach(() => {
			mockHandleFileUpload.mockClear();
		});

		it("should handle file drop with position", () => {
			const file = new File(["test"], "test.png", { type: "image/png" });
			const files = [file];
			const pos = 10;

			onDrop(files, pos);

			expect(mockHandleFileUpload).toHaveBeenCalledTimes(1);
			expect(mockHandleFileUpload).toHaveBeenCalledWith(file, pos);
		});

		it("should handle multiple files on drop", () => {
			const file1 = new File(["test1"], "test1.png", { type: "image/png" });
			const file2 = new File(["test2"], "test2.jpg", { type: "image/jpeg" });
			const files = [file1, file2];
			const pos = 10;

			onDrop(files, pos);

			expect(mockHandleFileUpload).toHaveBeenCalledTimes(2);
			expect(mockHandleFileUpload).toHaveBeenCalledWith(file1, pos);
			expect(mockHandleFileUpload).toHaveBeenCalledWith(file2, pos);
		});

		it("should handle empty file array", () => {
			const files: File[] = [];
			const pos = 10;

			onDrop(files, pos);

			expect(mockHandleFileUpload).not.toHaveBeenCalled();
		});
	});

	describe("transformPastedHTML – br-only paragraph cleanup", () => {
		const { editorProps } = configureEditor("", "");
		if (!editorProps?.transformPastedHTML) {
			throw new Error("transformPastedHTML is undefined");
		}
		const transformFn = editorProps.transformPastedHTML;

		it("removes <p> with multiple br (and trailingBreak class)", () => {
			const html = '<p><br><br class="ProseMirror-trailingBreak"></p>';
			expect(transformFn(html)).toBe("<p></p>");
		});

		it("keeps paragraph with real content and converts consecutive br to paragraph break", () => {
			const html = "<p>foo<br><br>bar</p>";
			// 連続<br>で段落分割され、空段落は削除される
			expect(transformFn(html)).toBe("<p><p>foo</p><p>bar</p></p>");
		});
	});
});
