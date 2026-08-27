import { describe, expect, it, vi } from "vitest";
import {
	getProviderFromModel,
	parseTranslationResponse,
	requestTranslation,
} from "./provider";

describe("翻訳provider adapter", () => {
	it("既存モデル名からproviderを決め、localeやプランを優先しない", () => {
		expect(getProviderFromModel("gpt-5-nano-2025-08-07")).toBe("openai");
		expect(getProviderFromModel("deepseek-reasoner")).toBe("deepseek");
		expect(getProviderFromModel("gemini-2.5-flash")).toBe("vertex");
		expect(getProviderFromModel("gemini-2.5-flash-lite")).toBe("vertex");
		expect(getProviderFromModel("legacy-model", "premium")).toBe("vertex");
		expect(getProviderFromModel("legacy-model", "free")).toBe("gemini");
		expect(getProviderFromModel("legacy-model")).toBe("gemini");
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
				model: "gpt-5-nano-2025-08-07",
				targetLocale: "fr",
				title: "Sutta",
				segments: [{ id: 1, number: 0, text: "Hello" }],
				translationContext: "",
			},
			{ fetchImpl, openaiApiKey: "secret-value" },
		);

		expect(response).toContain('"Hi"');
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("https://api.openai.com/v1/chat/completions");
		expect(calls[0]?.init.headers).toEqual(
			expect.objectContaining({ Authorization: "Bearer secret-value" }),
		);
		expect(JSON.stringify(calls[0]?.init)).not.toContain("source text");
	});

	it("一時的なprovider障害は旧仕様どおり3回まで再試行する", async () => {
		vi.useFakeTimers();
		try {
			let attempts = 0;
			const fetchImpl: typeof fetch = async () => {
				attempts += 1;
				if (attempts < 3)
					return new Response("temporary failure", { status: 503 });
				return new Response(
					JSON.stringify({
						choices: [{ message: { content: '[{"number":0,"text":"Hi"}]' } }],
					}),
					{ status: 200 },
				);
			};
			const resultPromise = requestTranslation(
				{
					provider: "openai",
					model: "gpt-5-nano-2025-08-07",
					targetLocale: "fr",
					title: "Sutta",
					segments: [{ id: 1, number: 0, text: "Hello" }],
					translationContext: "",
				},
				{ fetchImpl, openaiApiKey: "secret-value" },
			);
			await vi.runAllTimersAsync();
			expect(await resultPromise).toContain('"Hi"');
			expect(attempts).toBe(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it("再試行できないproviderエラーは1回で終了する", async () => {
		let attempts = 0;
		const fetchImpl: typeof fetch = async () => {
			attempts += 1;
			return new Response("bad request", { status: 400 });
		};

		await expect(
			requestTranslation(
				{
					provider: "openai",
					model: "gpt-5-nano-2025-08-07",
					targetLocale: "fr",
					title: "Sutta",
					segments: [{ id: 1, number: 0, text: "Hello" }],
					translationContext: "",
				},
				{ fetchImpl, openaiApiKey: "secret-value" },
			),
		).rejects.toMatchObject({ status: 400, retryable: false });
		expect(attempts).toBe(1);
	});

	it("Geminiのユーザーキーがない場合は共通設定へフォールバックせず即時失敗する", async () => {
		let attempts = 0;
		const fetchImpl: typeof fetch = async () => {
			attempts += 1;
			return new Response("unexpected", { status: 200 });
		};

		await expect(
			requestTranslation(
				{
					provider: "gemini",
					model: "gemini-2.5-flash",
					targetLocale: "fr",
					title: "Sutta",
					segments: [{ id: 1, number: 0, text: "Hello" }],
					translationContext: "",
				},
				{ fetchImpl },
			),
		).rejects.toMatchObject({ retryable: false });
		expect(attempts).toBe(0);
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
				provider: "gemini",
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

	it("VertexモデルをサービスアカウントOAuthで公式APIへ送る", async () => {
		const keyPair = await crypto.subtle.generateKey(
			{
				name: "RSASSA-PKCS1-v1_5",
				modulusLength: 2_048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256",
			},
			true,
			["sign", "verify"],
		);
		const privateKeyBytes = new Uint8Array(
			await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
		);
		let privateKeyBase64 = "";
		for (const byte of privateKeyBytes)
			privateKeyBase64 += String.fromCharCode(byte);
		const privateKey = `-----BEGIN PRIVATE KEY-----\n${btoa(privateKeyBase64)}\n-----END PRIVATE KEY-----`;
		const calls: Array<{ url: string; init: RequestInit }> = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			calls.push({ url: String(input), init: init ?? {} });
			if (calls.length === 1) {
				return new Response(
					JSON.stringify({ access_token: "vertex-access-token" }),
					{ status: 200 },
				);
			}
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
				provider: "vertex",
				model: "gemini-2.5-flash",
				targetLocale: "fr",
				title: "Sutta",
				segments: [{ id: 1, number: 0, text: "Hello" }],
				translationContext: "",
			},
			{
				fetchImpl,
				vertexProjectId: "project-1",
				vertexRegion: "us-central1",
				vertexServiceAccountEmail: "translator@example.iam.gserviceaccount.com",
				vertexServiceAccountPrivateKey: privateKey,
			},
		);

		expect(response).toContain('"Bonjour"');
		expect(calls[0]?.url).toBe("https://oauth2.googleapis.com/token");
		expect(calls[1]?.url).toBe(
			"https://us-central1-aiplatform.googleapis.com/v1/projects/project-1/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent",
		);
		expect(calls[1]?.init.headers).toEqual(
			expect.objectContaining({ Authorization: "Bearer vertex-access-token" }),
		);
	});
});
