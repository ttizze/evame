import { describe, expect, it } from "vitest";
import {
	getProviderFromModel,
	parseTranslationResponse,
	requestTranslation,
} from "./provider";

describe("翻訳provider adapter", () => {
	it("既存モデル名からproviderを決め、localeやプランを優先しない", () => {
		expect(getProviderFromModel("gpt-5-nano-2025-08-07")).toBe("openai");
		expect(getProviderFromModel("deepseek-chat")).toBe("deepseek");
		expect(getProviderFromModel("gemini-2.5-flash")).toBe("gemini");
		expect(getProviderFromModel("gemini-2.5-flash-lite")).toBe("gemini");
	});

	it("配列・translationsラッパー・コードフェンスを安全に読み取る", () => {
		expect(
			parseTranslationResponse(
				'```json\n{"translations":[{"number":0,"text":"Hello"}]}\n```',
			),
		).toEqual([{ number: 0, text: "Hello" }]);
	});

	it("不正な番号や空文字を結果から除外する", () => {
		expect(
			parseTranslationResponse(
				JSON.stringify([
					{ number: 0, text: " ok " },
					{ number: -1, text: "bad" },
					{ number: 1, text: "" },
					{ number: "2", text: "bad" },
				]),
			),
		).toEqual([{ number: 0, text: "ok" }]);
	});

	it("JSONの前後に説明が付いた応答から改行を保って抽出する", () => {
		expect(
			parseTranslationResponse('結果です: {"number":1,"text":"line\\nnext"}'),
		).toEqual([{ number: 1, text: "line\nnext" }]);
	});

	it("公式fetch APIへ秘密値をAuthorizationだけで渡す", async () => {
		const calls: Array<{ url: string; init: RequestInit }> = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			calls.push({ url: String(input), init: init ?? {} });
			return new Response(
				JSON.stringify({
					choices: [{ message: { content: '[{"number":0,"text":"Hi"}]' } }],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const response = await requestTranslation(
			{
				provider: "openai",
				apiKey: "secret-value",
				model: "gpt-5-nano-2025-08-07",
				targetLocale: "fr",
				title: "Sutta",
				segments: [{ id: 1, number: 0, text: "Hello" }],
				translationContext: "",
			},
			{ fetchImpl },
		);

		expect(response).toContain('"Hi"');
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("https://api.openai.com/v1/chat/completions");
		expect(calls[0]?.init.headers).toEqual(
			expect.objectContaining({ Authorization: "Bearer secret-value" }),
		);
		expect(JSON.stringify(calls[0]?.init)).not.toContain("source text");
	});

	it("GeminiモデルをGemini APIへ送り、APIキーを専用ヘッダーに設定する", async () => {
		const calls: Array<{ url: string; init: RequestInit }> = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			calls.push({ url: String(input), init: init ?? {} });
			return new Response(
				JSON.stringify({
					candidates: [
						{
							content: {
								parts: [{ text: '[{"number":0,"text":"Bonjour"}]' }],
							},
						},
					],
				}),
				{ status: 200 },
			);
		};

		const response = await requestTranslation(
			{
				provider: getProviderFromModel("gemini-2.5-flash"),
				apiKey: "gemini-secret",
				model: "gemini-2.5-flash",
				targetLocale: "fr",
				title: "Sutta",
				segments: [{ id: 1, number: 0, text: "Hello" }],
				translationContext: "",
			},
			{ fetchImpl },
		);

		expect(response).toContain('"Bonjour"');
		expect(calls[0]?.url).toBe(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
		);
		expect(calls[0]?.init.headers).toEqual(
			expect.objectContaining({ "x-goog-api-key": "gemini-secret" }),
		);
	});
});
