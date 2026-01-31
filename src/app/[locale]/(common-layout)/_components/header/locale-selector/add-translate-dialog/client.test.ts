import { describe, expect, it } from "vitest";
import { canTranslateWithoutGeminiApiKey } from "./client";

describe("canTranslateWithoutGeminiApiKey", () => {
	it("GeminiモデルでAPIキーがない場合は翻訳できない", () => {
		expect(canTranslateWithoutGeminiApiKey(false, "gemini-2.0-flash")).toBe(
			false,
		);
	});

	it("GeminiモデルでAPIキーがある場合は翻訳できる", () => {
		expect(canTranslateWithoutGeminiApiKey(true, "gemini-2.0-flash")).toBe(
			true,
		);
	});

	it("Gemini以外のモデルならAPIキーがなくても翻訳できる", () => {
		expect(
			canTranslateWithoutGeminiApiKey(false, "gpt-5-nano-2025-08-07"),
		).toBe(true);
	});
});
