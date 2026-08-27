import { generateTranslationPrompt } from "./prompt";
import type {
	ProviderTranslationInput,
	TranslationProviderConfig,
	TranslationProviderName,
} from "./types";
import { parseTranslationResult } from "./validation";

export class TranslationProviderError extends Error {
	readonly retryable: boolean;
	readonly status: number | undefined;

	constructor(
		message: string,
		options: { retryable: boolean; status?: number },
	) {
		super(message);
		this.name = "TranslationProviderError";
		this.retryable = options.retryable;
		this.status = options.status;
	}
}

/** 既存Evameのモデル選択を維持し、localeやユーザープランでproviderを変えない。 */
export function getProviderFromModel(model: string): TranslationProviderName {
	if (model.startsWith("gpt-")) return "openai";
	if (model.startsWith("deepseek-")) return "deepseek";
	if (model.startsWith("gemini-")) return "gemini";
	return "gemini";
}

function stripCodeFence(value: string): string {
	const trimmed = value.trim();
	if (!trimmed.startsWith("```")) return trimmed;
	return trimmed
		.replace(/^```(?:json)?\s*/iu, "")
		.replace(/\s*```$/u, "")
		.trim();
}

/** providerの応答を安全に翻訳結果へ変換する。未検証の項目は破棄する。 */
export function parseTranslationResponse(value: string): Array<{
	number: number;
	text: string;
}> {
	const text = stripCodeFence(value);
	try {
		const parsed: unknown = JSON.parse(text);
		const candidates = Array.isArray(parsed)
			? parsed
			: parsed && typeof parsed === "object" && !Array.isArray(parsed)
				? (parsed as Record<string, unknown>).translations
				: undefined;
		if (Array.isArray(candidates)) {
			return candidates
				.map(parseTranslationResult)
				.filter(
					(item): item is { number: number; text: string } => item !== null,
				);
		}
	} catch {
		// 応答の前後に説明文が付くproviderがあるため、下の限定的な抽出へ進む。
	}

	const results: Array<{ number: number; text: string }> = [];
	const itemPattern =
		/\{\s*"number"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/gu;
	for (const match of text.matchAll(itemPattern)) {
		const number = Number(match[1]);
		const rawText = match[2];
		if (!Number.isSafeInteger(number) || rawText === undefined) continue;
		let decodedText: string;
		try {
			decodedText = JSON.parse(`"${rawText}"`) as string;
		} catch {
			continue;
		}
		const parsed = parseTranslationResult({ number, text: decodedText });
		if (parsed) results.push(parsed);
	}
	return results;
}

function providerUrl(
	provider: TranslationProviderName,
	model: string,
	config: TranslationProviderConfig,
): string {
	const baseUrl = (value: string): string => value.replace(/\/+$/u, "");
	if (provider === "openai") {
		return `${baseUrl(config.openaiBaseUrl ?? "https://api.openai.com/v1")}/chat/completions`;
	}
	if (provider === "deepseek") {
		return `${baseUrl(config.deepseekBaseUrl ?? "https://api.deepseek.com")}/chat/completions`;
	}
	return `${baseUrl(config.geminiBaseUrl ?? "https://generativelanguage.googleapis.com")}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

function apiKeyFor(
	provider: TranslationProviderName,
	config: TranslationProviderConfig,
): string | undefined {
	if (provider === "openai") return config.openaiApiKey;
	if (provider === "deepseek") return config.deepseekApiKey;
	return config.geminiApiKey;
}

function isRetryableStatus(status: number): boolean {
	return (
		status === 408 ||
		status === 409 ||
		status === 425 ||
		status === 429 ||
		status >= 500
	);
}

function providerHeaders(
	provider: TranslationProviderName,
	apiKey: string,
): Record<string, string> {
	const headers = { "Content-Type": "application/json" };
	if (provider === "gemini") {
		return { ...headers, "x-goog-api-key": apiKey };
	}
	return { ...headers, Authorization: `Bearer ${apiKey}` };
}

function requestBody(
	provider: TranslationProviderName,
	input: ProviderTranslationInput,
): Record<string, unknown> {
	const prompt = generateTranslationPrompt(input);
	if (provider === "openai" || provider === "deepseek") {
		return {
			model: input.model,
			messages: [{ role: "user", content: prompt }],
			response_format: { type: "json_object" },
		};
	}
	return {
		contents: [{ role: "user", parts: [{ text: prompt }] }],
		generationConfig: {
			responseMimeType: "application/json",
			responseSchema: {
				type: "OBJECT",
				properties: {
					translations: {
						type: "ARRAY",
						items: {
							type: "OBJECT",
							properties: {
								number: { type: "INTEGER" },
								text: { type: "STRING" },
							},
							required: ["number", "text"],
						},
					},
				},
				required: ["translations"],
			},
		},
	};
}

function responseText(
	provider: TranslationProviderName,
	value: unknown,
): string {
	if (!value || typeof value !== "object") return "";
	const object = value as Record<string, unknown>;
	if (provider === "openai" || provider === "deepseek") {
		const choices = object.choices;
		if (
			!Array.isArray(choices) ||
			!choices[0] ||
			typeof choices[0] !== "object"
		)
			return "";
		const message = (choices[0] as Record<string, unknown>).message;
		if (!message || typeof message !== "object") return "";
		const content = (message as Record<string, unknown>).content;
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			return content
				.filter(
					(part): part is Record<string, unknown> =>
						typeof part === "object" && part !== null,
				)
				.map((part) => (typeof part.text === "string" ? part.text : ""))
				.join("");
		}
		return "";
	}
	const candidates = object.candidates;
	if (
		!Array.isArray(candidates) ||
		!candidates[0] ||
		typeof candidates[0] !== "object"
	)
		return "";
	const content = (candidates[0] as Record<string, unknown>).content;
	if (!content || typeof content !== "object") return "";
	const parts = (content as Record<string, unknown>).parts;
	if (!Array.isArray(parts)) return "";
	return parts
		.filter(
			(part): part is Record<string, unknown> =>
				typeof part === "object" && part !== null,
		)
		.map((part) => (typeof part.text === "string" ? part.text : ""))
		.join("");
}

export async function requestTranslation(
	input: ProviderTranslationInput & {
		provider: TranslationProviderName;
		apiKey?: string;
	},
	config: TranslationProviderConfig = {},
): Promise<string> {
	const apiKey = input.apiKey ?? apiKeyFor(input.provider, config);
	if (!apiKey || apiKey.trim().length === 0) {
		throw new TranslationProviderError("翻訳providerの認証情報が未設定です", {
			retryable: false,
		});
	}
	const url = providerUrl(input.provider, input.model, config);
	const fetchImpl = config.fetchImpl ?? globalThis.fetch;
	const headers = providerHeaders(input.provider, apiKey);
	const requestInit: RequestInit = {
		method: "POST",
		headers,
		body: JSON.stringify(requestBody(input.provider, input)),
	};
	const timeoutMs = config.timeoutMs ?? 120_000;
	const controller = new AbortController();
	if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
		requestInit.signal = controller.signal;
	}
	const timeout =
		Number.isFinite(timeoutMs) && timeoutMs > 0
			? setTimeout(() => controller.abort(), timeoutMs)
			: undefined;
	let response: Response;
	try {
		response = await fetchImpl(url, requestInit);
	} catch {
		throw new TranslationProviderError("翻訳providerへの接続に失敗しました", {
			retryable: true,
		});
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
	}
	if (!response.ok) {
		throw new TranslationProviderError(
			"翻訳providerがリクエストを拒否しました",
			{
				retryable: isRetryableStatus(response.status),
				status: response.status,
			},
		);
	}
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new TranslationProviderError("翻訳providerの応答形式が不正です", {
			retryable: true,
		});
	}
	const translated = responseText(input.provider, payload).trim();
	if (!translated) {
		throw new TranslationProviderError("翻訳providerが空の応答を返しました", {
			retryable: true,
		});
	}
	return translated;
}
