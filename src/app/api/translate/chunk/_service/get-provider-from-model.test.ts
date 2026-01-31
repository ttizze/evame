import { describe, expect, it } from "vitest";
import { getProviderFromModel } from "./get-provider-from-model";

describe("getProviderFromModel", () => {
	it("Geminiモデル + フリープランのとき、Vertexを選ぶ", () => {
		expect(getProviderFromModel("gemini-2.5-flash-lite", "free")).toBe(
			"vertex",
		);
	});

	it("OpenAIモデルのとき、openaiを選ぶ", () => {
		expect(getProviderFromModel("gpt-5-nano-2025-08-07")).toBe("openai");
	});

	it("DeepSeekモデルのとき、deepseekを選ぶ", () => {
		expect(getProviderFromModel("deepseek-reasoner")).toBe("deepseek");
	});

	it("不明なモデル + プレミアムのとき、Vertexを選ぶ", () => {
		expect(getProviderFromModel("unknown-model", "premium")).toBe("vertex");
	});
});
