import { describe, expect, it } from "vitest";
import { getProviderFromModel } from "./get-provider-from-model";

describe("getProviderFromModel", () => {
	it("GeminiモデルはフリープランでもVertexを使う", () => {
		expect(getProviderFromModel("gemini-2.5-flash-lite")).toBe("vertex");
	});

	it("OpenAIモデルは常にopenaiを使う", () => {
		expect(getProviderFromModel("gpt-5-nano-2025-08-07")).toBe("openai");
	});

	it("DeepSeekモデルは常にdeepseekを使う", () => {
		expect(getProviderFromModel("deepseek-reasoner")).toBe("deepseek");
	});

	it("不明なモデルはプレミアムならVertexを使う", () => {
		expect(getProviderFromModel("unknown-model", "premium")).toBe("vertex");
	});
});
