import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { buildTranslationData } from "./build-translation-data";

describe("buildTranslationData", () => {
	let errorSpy: MockInstance<typeof console.error>;

	beforeEach(() => {
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it("正常系: すべての翻訳がセグメントとマッチする場合", () => {
		const extracted = [
			{ number: 1, text: "Hello" },
			{ number: 2, text: "World" },
		];
		const segments = [
			{ id: 100, number: 1, text: "Hello" },
			{ id: 200, number: 2, text: "World" },
		];
		const locale = "ja";
		const userId = "user-123";

		const result = buildTranslationData(extracted, segments, locale, userId);

		expect(result).toEqual([
			{ locale: "ja", text: "Hello", userId: "user-123", segmentId: 100 },
			{ locale: "ja", text: "World", userId: "user-123", segmentId: 200 },
		]);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("一部の翻訳がセグメントとマッチしない場合、エラーログが出て該当要素は除外される", () => {
		const extracted = [
			{ number: 1, text: "Hello" },
			{ number: 999, text: "NotFound" }, // 存在しないセグメント番号
			{ number: 2, text: "World" },
		];
		const segments = [
			{ id: 100, number: 1, text: "Hello" },
			{ id: 200, number: 2, text: "World" },
		];
		const locale = "ja";
		const userId = "user-123";

		const result = buildTranslationData(extracted, segments, locale, userId);

		expect(result).toEqual([
			{ locale: "ja", text: "Hello", userId: "user-123", segmentId: 100 },
			{ locale: "ja", text: "World", userId: "user-123", segmentId: 200 },
		]);
		expect(errorSpy).toHaveBeenCalledWith("segment #999 not found (NotFound)");
	});

	it("すべての翻訳がセグメントとマッチしない場合、空配列を返す", () => {
		const extracted = [
			{ number: 999, text: "NotFound1" },
			{ number: 998, text: "NotFound2" },
		];
		const segments = [
			{ id: 100, number: 1, text: "Hello" },
			{ id: 200, number: 2, text: "World" },
		];
		const locale = "ja";
		const userId = "user-123";

		const result = buildTranslationData(extracted, segments, locale, userId);

		expect(result).toEqual([]);
		expect(errorSpy).toHaveBeenCalledTimes(2);
	});

	it("空の翻訳配列が渡された場合、空配列を返す", () => {
		const extracted: Array<{ number: number; text: string }> = [];
		const segments = [
			{ id: 100, number: 1, text: "Hello" },
			{ id: 200, number: 2, text: "World" },
		];
		const locale = "ja";
		const userId = "user-123";

		const result = buildTranslationData(extracted, segments, locale, userId);

		expect(result).toEqual([]);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("セグメントが空の場合、空配列を返す", () => {
		const extracted = [
			{ number: 1, text: "Hello" },
			{ number: 2, text: "World" },
		];
		const segments: Array<{ id: number; number: number; text: string }> = [];
		const locale = "ja";
		const userId = "user-123";

		const result = buildTranslationData(extracted, segments, locale, userId);

		expect(result).toEqual([]);
		expect(errorSpy).toHaveBeenCalledTimes(2);
	});

	it("同じセグメント番号が複数ある場合、最後のセグメントIDを使用する", () => {
		const extracted = [{ number: 1, text: "Hello" }];
		const segments = [
			{ id: 100, number: 1, text: "Hello" },
			{ id: 200, number: 1, text: "Hello Duplicate" }, // 同じ番号
		];
		const locale = "ja";
		const userId = "user-123";

		const result = buildTranslationData(extracted, segments, locale, userId);

		// Map は最後に見つかった値を保持する
		expect(result).toEqual([
			{ locale: "ja", text: "Hello", userId: "user-123", segmentId: 200 },
		]);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it("異なるロケールとユーザーIDが正しく設定される", () => {
		const extracted = [{ number: 1, text: "Hello" }];
		const segments = [{ id: 100, number: 1, text: "Hello" }];
		const locale = "en";
		const userId = "user-456";

		const result = buildTranslationData(extracted, segments, locale, userId);

		expect(result).toEqual([
			{ locale: "en", text: "Hello", userId: "user-456", segmentId: 100 },
		]);
	});
});
