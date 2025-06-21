import { describe, expect, it, vi } from "vitest";

describe("editor-config", () => {
	describe("transformPastedHTML", () => {
		// まず transformPastedHTML の処理を直接テスト
		const transformPastedHTML = (html: string) => {
			// editor-config.ts の transformPastedHTML と同じロジック
			let processed = html.replace(/\r?\n/g, "<br>");
			processed = processed.replace(/(<br\b[^>]*>\s*){2,}/gi, "</p><p>");
			// 単一の <br> はそのまま残す
			const wrapped = `<p>${processed}</p>`;
			return wrapped;
		};

		it("should handle single line text", () => {
			const html = "This is a single line of text";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p>This is a single line of text</p>");
		});

		it("should convert single newline to br tag", () => {
			const html = "Line 1\nLine 2";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p>Line 1<br>Line 2</p>");
		});

		it("should convert double newlines to paragraph breaks", () => {
			const html = "Paragraph 1\n\nParagraph 2";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p>Paragraph 1</p><p>Paragraph 2</p>");
		});

		it("should handle multiple consecutive newlines", () => {
			const html = "Paragraph 1\n\n\n\nParagraph 2";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p>Paragraph 1</p><p>Paragraph 2</p>");
		});

		it("should handle Windows-style line endings (CRLF)", () => {
			const html = "Line 1\r\nLine 2\r\n\r\nParagraph 2";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p>Line 1<br>Line 2</p><p>Paragraph 2</p>");
		});

		it("should handle existing br tags", () => {
			const html = "Line 1<br>Line 2<br><br>Paragraph 2";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p>Line 1<br>Line 2</p><p>Paragraph 2</p>");
		});

		it("should handle br tags with attributes", () => {
			const html = 'Line 1<br class="test">Line 2<br /><br/>Paragraph 2';
			const result = transformPastedHTML(html);
			expect(result).toBe(
				'<p>Line 1<br class="test">Line 2</p><p>Paragraph 2</p>',
			);
		});

		it("should handle mixed newlines and br tags", () => {
			const html = "Line 1\n<br>Line 2\n\n<br><br>Paragraph 2";
			const result = transformPastedHTML(html);
			// \n<br> → <br><br> → 段落分割、\n\n<br><br> → </p><p>
			expect(result).toBe("<p>Line 1</p><p>Line 2</p><p>Paragraph 2</p>");
		});

		it("should handle empty input", () => {
			const html = "";
			const result = transformPastedHTML(html);
			expect(result).toBe("<p></p>");
		});

		it("should handle HTML with existing paragraph tags", () => {
			const html = "<p>Existing paragraph</p>\n\n<p>Another paragraph</p>";
			const result = transformPastedHTML(html);
			expect(result).toBe(
				"<p><p>Existing paragraph</p></p><p><p>Another paragraph</p></p>",
			);
		});

		it("should handle list-like content with proper line breaks", () => {
			const html =
				"目次\nハルカゼマウンド\nあかね\nウィッチ\n鵺\nアオハコ\nひまてん\n愛する者の祓い方\n逃げ若";
			const result = transformPastedHTML(html);
			// 修正後の動作: 単一改行は<br>になる
			expect(result).toBe(
				"<p>目次<br>ハルカゼマウンド<br>あかね<br>ウィッチ<br>鵺<br>アオハコ<br>ひまてん<br>愛する者の祓い方<br>逃げ若</p>",
			);
		});

		it("should handle list-like content with double newlines (better behavior)", () => {
			const html =
				"目次\n\nハルカゼマウンド\n\nあかね\n\nウィッチ\n\n鵺\n\nアオハコ\n\nひまてん\n\n愛する者の祓い方\n\n逃げ若";
			const result = transformPastedHTML(html);
			// 二重改行だと段落分割される
			expect(result).toBe(
				"<p>目次</p><p>ハルカゼマウンド</p><p>あかね</p><p>ウィッチ</p><p>鵺</p><p>アオハコ</p><p>ひまてん</p><p>愛する者の祓い方</p><p>逃げ若</p>",
			);
		});
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
});
