import { describe, expect, it } from "vitest";
import {
	calculateTranslationProgress,
	isTranslationComplete,
} from "./progress";

describe("翻訳ジョブの進捗", () => {
	it("部分的に保存されたセグメント数を100分率へ変換する", () => {
		expect(calculateTranslationProgress(1, 3)).toBe(33);
		expect(calculateTranslationProgress(2, 3)).toBe(66);
	});

	it("全セグメント完了時だけ完了と判定し、超過は100に丸める", () => {
		expect(isTranslationComplete(2, 3)).toBe(false);
		expect(isTranslationComplete(3, 3)).toBe(true);
		expect(calculateTranslationProgress(5, 3)).toBe(100);
	});

	it("翻訳対象が空なら即時完了として扱う", () => {
		expect(isTranslationComplete(0, 0)).toBe(true);
		expect(calculateTranslationProgress(0, 0)).toBe(100);
	});
});
