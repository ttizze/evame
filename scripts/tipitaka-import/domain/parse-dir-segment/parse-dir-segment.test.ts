import { describe, expect, it } from "vitest";
import { parseDirSegment } from "./parse-dir-segment";

describe("parseDirSegment", () => {
	it("数字で始まるディレクトリセグメントを渡すと、順序番号とタイトルを抽出する", () => {
		// Arrange
		const dirSegment = "01-sutta";

		// Act
		const result = parseDirSegment(dirSegment);

		// Assert
		expect(result.order).toBe(1);
		expect(result.title).toBe("Sutta");
	});

	it("複数桁の数字で始まるディレクトリセグメントを渡すと、正しく順序番号を抽出する", () => {
		// Arrange
		const dirSegment = "123-long-category-name";

		// Act
		const result = parseDirSegment(dirSegment);

		// Assert
		expect(result.order).toBe(123);
		expect(result.title).toBe("Long Category Name");
	});

	it("ハイフンを含むタイトル部分を正しく処理する", () => {
		// Arrange
		const dirSegment = "02-diggha-nikaya";

		// Act
		const result = parseDirSegment(dirSegment);

		// Assert
		expect(result.order).toBe(2);
		expect(result.title).toBe("Diggha Nikaya");
	});

	it("数字で始まらないディレクトリセグメントを渡すと、エラーを投げる", () => {
		// Arrange
		const dirSegment = "invalid-segment";

		// Act & Assert
		expect(() => parseDirSegment(dirSegment)).toThrow(
			"Invalid directory segment: invalid-segment",
		);
	});

	it("数字のみのディレクトリセグメントを渡すと、エラーを投げる", () => {
		// Arrange
		const dirSegment = "123";

		// Act & Assert
		expect(() => parseDirSegment(dirSegment)).toThrow(
			"Invalid directory segment: 123",
		);
	});

	it("空文字列を渡すと、エラーを投げる", () => {
		// Arrange
		const dirSegment = "";

		// Act & Assert
		expect(() => parseDirSegment(dirSegment)).toThrow(
			"Invalid directory segment: ",
		);
	});
});
