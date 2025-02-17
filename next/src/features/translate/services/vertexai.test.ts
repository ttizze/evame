// import { describe, expect, it } from "vitest";
// import { getVertexAIModelResponse } from "./vertexai";

test("hello world", () => {
	expect(1).toBe(1);
});

// describe("getVertexAIModelResponse Integration Test", () => {
// 	it("should translate text from English to Japanese", async () => {
// 		const result = await getVertexAIModelResponse(
// 			"gemini-pro",
// 			"Test Translation",
// 			"Hello, how are you today?",
// 			"ja",
// 		);

// 		const parsedResult = JSON.parse(result);
// 		console.log("Translation result:", parsedResult);

// 		// レスポンスの構造を確認
// 		expect(parsedResult.response).toBeDefined();
// 		expect(Array.isArray(parsedResult.response)).toBe(true);
// 		expect(parsedResult.response[0]).toHaveProperty("number");
// 		expect(parsedResult.response[0]).toHaveProperty("text");

// 		// 日本語のテキストが含まれていることを確認
// 		const translatedText = parsedResult.response[0].text;
// 		expect(typeof translatedText).toBe("string");
// 		expect(translatedText.length).toBeGreaterThan(0);
// 		// 日本語の文字が含まれているか確認
// 		expect(translatedText).toMatch(
// 			/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/,
// 		);
// 	}, 30000); // タイムアウトを30秒に設定

// 	it("should translate text from Japanese to English", async () => {
// 		const result = await getVertexAIModelResponse(
// 			"gemini-pro",
// 			"テスト翻訳",
// 			"こんにちは、お元気ですか？",
// 			"en",
// 		);

// 		const parsedResult = JSON.parse(result);
// 		console.log("Translation result:", parsedResult);

// 		expect(parsedResult.response).toBeDefined();
// 		expect(Array.isArray(parsedResult.response)).toBe(true);
// 		expect(parsedResult.response[0]).toHaveProperty("number");
// 		expect(parsedResult.response[0]).toHaveProperty("text");

// 		// 英語のテキストが含まれていることを確認
// 		const translatedText = parsedResult.response[0].text;
// 		expect(typeof translatedText).toBe("string");
// 		expect(translatedText.length).toBeGreaterThan(0);
// 		// 英語の文字のみが含まれているか確認
// 		expect(translatedText).toMatch(/^[A-Za-z\s.,!?]+$/);
// 	}, 30000); // タイムアウトを30秒に設定
// });
