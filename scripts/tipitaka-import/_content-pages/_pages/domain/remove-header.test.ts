import { describe, expect, it } from "vitest";
import { removeHeader } from "./remove-header";

describe("removeHeader", () => {
	it("最初の行が `# ` で始まる場合、その行を削除してボディを返す", () => {
		// Arrange
		const markdown = `# タイトル

本文の内容です。
複数行の本文。`;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の内容です。
複数行の本文。`);
	});

	it("最初の行が `# ` で始まり、次の行が `## ` で始まる場合、両方の行を削除する", () => {
		// Arrange
		const markdown = `# タイトル
## サブタイトル

本文の内容です。`;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の内容です。`);
	});

	it("最初の行が `# ` で始まらない場合、そのまま返す", () => {
		// Arrange
		const markdown = `本文の内容です。
## これは削除されない`;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の内容です。
## これは削除されない`);
	});

	it("最初の行が空白を含む `# ` で始まる場合、ヘッダーを削除する", () => {
		// Arrange
		const markdown = `  # タイトル（前後に空白）

本文の内容です。`;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の内容です。`);
	});

	it("次の行が空白を含む `## ` で始まる場合、両方の行を削除する", () => {
		// Arrange
		const markdown = `# タイトル
  ## サブタイトル（前後に空白）

本文の内容です。`;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の内容です。`);
	});

	it("改行コードが `\\r\\n` の場合、正しく処理する", () => {
		// Arrange
		const markdown = `# タイトル\r\n\r\n本文の内容です。`;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の内容です。`);
	});

	it("ヘッダー削除後、前後の空白をtrimする", () => {
		// Arrange
		const markdown = `# タイトル

  本文の前後に空白があります。
  `;

		// Act
		const result = removeHeader(markdown);

		// Assert
		expect(result.body).toBe(`本文の前後に空白があります。`);
	});
});
