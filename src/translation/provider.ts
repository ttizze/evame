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
	readonly retryDelayMs: number | undefined;

	constructor(
		message: string,
		options: { retryable: boolean; status?: number; retryDelayMs?: number },
	) {
		super(message);
		this.name = "TranslationProviderError";
		this.retryable = options.retryable;
		this.status = options.status;
		this.retryDelayMs = options.retryDelayMs;
	}
}

/** 旧Evameのモデル選択を維持し、gemini-*はVertexへ送る。 */
export function getProviderFromModel(
	model: string,
	userPlan?: string,
): TranslationProviderName {
	if (model.startsWith("gpt-")) return "openai";
	if (model.startsWith("deepseek-")) return "deepseek";
	if (model.startsWith("gemini-")) return "vertex";
	if (userPlan === "premium") return "vertex";
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
	if (provider === "vertex") {
		if (!config.vertexProjectId || !config.vertexRegion) {
			throw new TranslationProviderError("Vertex AIの接続設定が未設定です", {
				retryable: false,
			});
		}
		const vertexBaseUrl =
			config.vertexBaseUrl ??
			`https://${config.vertexRegion}-aiplatform.googleapis.com`;
		return `${baseUrl(vertexBaseUrl)}/v1/projects/${encodeURIComponent(config.vertexProjectId)}/locations/${encodeURIComponent(config.vertexRegion)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
	}
	return `${baseUrl(config.geminiBaseUrl ?? "https://generativelanguage.googleapis.com")}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

function apiKeyFor(
	provider: TranslationProviderName,
	config: TranslationProviderConfig,
): string | undefined {
	if (provider === "openai") return config.openaiApiKey;
	if (provider === "deepseek") return config.deepseekApiKey;
	return undefined;
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

const MAX_PROVIDER_ATTEMPTS = 3;

function retryDelayFromResponse(
	status: number,
	headers: Headers,
	body: string,
): number | undefined {
	if (status !== 429) return undefined;
	const retryAfter = headers.get("Retry-After");
	const retryAfterSeconds = retryAfter ? Number.parseFloat(retryAfter) : NaN;
	const bodyDelay = body.match(
		/(?:retry in|retryDelay["']?\s*:\s*["']?)(\d+(?:\.\d+)?)s/iu,
	);
	const retryDelaySeconds = Number.isFinite(retryAfterSeconds)
		? retryAfterSeconds
		: bodyDelay?.[1]
			? Number.parseFloat(bodyDelay[1])
			: NaN;
	if (Number.isFinite(retryDelaySeconds)) {
		return Math.ceil(retryDelaySeconds * 1_000) + 1_000;
	}
	return 30_000;
}

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CLOUD_PLATFORM_SCOPE =
	"https://www.googleapis.com/auth/cloud-platform";

function base64Url(value: string | Uint8Array): string {
	const bytes =
		typeof value === "string" ? new TextEncoder().encode(value) : value;
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/u, "");
}

function privateKeyBytes(value: string): Uint8Array<ArrayBuffer> {
	const normalized = value.replaceAll("\\n", "\n").trim();
	const match = normalized.match(
		/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/u,
	);
	if (!match?.[1]) throw new Error("サービスアカウント秘密鍵の形式が不正です");
	const encoded = match[1].replace(/\s+/gu, "");
	try {
		const binary = atob(encoded);
		const bytes = new Uint8Array(new ArrayBuffer(binary.length));
		for (const [index, character] of [...binary].entries()) {
			bytes[index] = character.charCodeAt(0);
		}
		return bytes;
	} catch {
		throw new Error("サービスアカウント秘密鍵の形式が不正です");
	}
}

async function fetchVertexAccessToken(
	config: TranslationProviderConfig,
): Promise<string> {
	if (
		!config.vertexServiceAccountEmail ||
		!config.vertexServiceAccountPrivateKey
	) {
		throw new TranslationProviderError(
			"Vertex AIのサービスアカウント設定が未設定です",
			{ retryable: false },
		);
	}

	const issuedAt = Math.floor(Date.now() / 1_000);
	const claims = {
		iss: config.vertexServiceAccountEmail,
		scope: GOOGLE_CLOUD_PLATFORM_SCOPE,
		aud: GOOGLE_OAUTH_TOKEN_URL,
		iat: issuedAt,
		exp: issuedAt + 3_600,
	};
	const unsignedToken = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify(claims))}`;
	let signature: ArrayBuffer;
	try {
		const key = await globalThis.crypto.subtle.importKey(
			"pkcs8",
			privateKeyBytes(config.vertexServiceAccountPrivateKey),
			{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
			false,
			["sign"],
		);
		signature = await globalThis.crypto.subtle.sign(
			"RSASSA-PKCS1-v1_5",
			key,
			new TextEncoder().encode(unsignedToken),
		);
	} catch {
		throw new TranslationProviderError(
			"Vertex AIのサービスアカウント認証に失敗しました",
			{ retryable: false },
		);
	}

	const fetchImpl = config.fetchImpl ?? globalThis.fetch;
	let response: Response;
	try {
		response = await fetchImpl(GOOGLE_OAUTH_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion: `${unsignedToken}.${base64Url(new Uint8Array(signature))}`,
			}),
		});
	} catch {
		throw new TranslationProviderError(
			"Vertex AI OAuthへの接続に失敗しました",
			{
				retryable: true,
			},
		);
	}
	if (!response.ok) {
		throw new TranslationProviderError("Vertex AI OAuthが認証を拒否しました", {
			retryable: isRetryableStatus(response.status),
			status: response.status,
		});
	}
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new TranslationProviderError("Vertex AI OAuthの応答形式が不正です", {
			retryable: true,
		});
	}
	const accessToken =
		payload && typeof payload === "object"
			? (payload as Record<string, unknown>).access_token
			: undefined;
	if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
		throw new TranslationProviderError("Vertex AI OAuth tokenが空です", {
			retryable: false,
		});
	}
	return accessToken;
}

function providerHeaders(
	provider: TranslationProviderName,
	credential: string,
): Record<string, string> {
	const headers = { "Content-Type": "application/json" };
	if (provider === "gemini") {
		return { ...headers, "x-goog-api-key": credential };
	}
	return { ...headers, Authorization: `Bearer ${credential}` };
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
	const maxOutputTokens = input.model.startsWith("gemini-2.5") ? 65_535 : 8_192;
	const safetySettings = [
		{
			category: "HARM_CATEGORY_HARASSMENT",
			threshold: provider === "vertex" ? "BLOCK_ONLY_HIGH" : "BLOCK_NONE",
		},
		{
			category: "HARM_CATEGORY_HATE_SPEECH",
			threshold: provider === "vertex" ? "BLOCK_ONLY_HIGH" : "BLOCK_NONE",
		},
		{
			category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
			threshold: provider === "vertex" ? "BLOCK_ONLY_HIGH" : "BLOCK_NONE",
		},
		{
			category: "HARM_CATEGORY_DANGEROUS_CONTENT",
			threshold: provider === "vertex" ? "BLOCK_ONLY_HIGH" : "BLOCK_NONE",
		},
	];
	return {
		contents: [{ role: "user", parts: [{ text: prompt }] }],
		safetySettings,
		generationConfig: {
			responseMimeType: "application/json",
			maxOutputTokens,
			responseSchema: {
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
	const credential =
		input.provider === "vertex"
			? await fetchVertexAccessToken(config)
			: input.provider === "gemini"
				? input.apiKey
				: apiKeyFor(input.provider, config);
	if (!credential || credential.trim().length === 0) {
		throw new TranslationProviderError("翻訳providerの認証情報が未設定です", {
			retryable: false,
		});
	}
	const url = providerUrl(input.provider, input.model, config);
	const fetchImpl = config.fetchImpl ?? globalThis.fetch;
	const requestOnce = async (): Promise<string> => {
		const requestInit: RequestInit = {
			method: "POST",
			headers: providerHeaders(input.provider, credential),
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
			let errorBody = "";
			try {
				errorBody = await response.text();
			} catch {
				// 再試行判定に必要な本文を取得できない場合は既定値を使う。
			}
			throw new TranslationProviderError(
				"翻訳providerがリクエストを拒否しました",
				{
					retryable: isRetryableStatus(response.status),
					status: response.status,
					retryDelayMs: retryDelayFromResponse(
						response.status,
						response.headers,
						errorBody,
					),
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
	};

	for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
		try {
			return await requestOnce();
		} catch (error) {
			if (
				!(error instanceof TranslationProviderError) ||
				!error.retryable ||
				attempt === MAX_PROVIDER_ATTEMPTS
			) {
				throw error;
			}
			await new Promise<void>((resolve) =>
				setTimeout(resolve, error.retryDelayMs ?? 1_000 * attempt),
			);
		}
	}
	throw new TranslationProviderError("翻訳providerへの接続に失敗しました", {
		retryable: true,
	});
}
