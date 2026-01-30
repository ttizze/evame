import {
	GoogleGenerativeAI,
	HarmBlockThreshold,
	HarmCategory,
	SchemaType,
} from "@google/generative-ai";
import { decrypt } from "@/app/_service/encryption.server";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateTranslationPrompt } from "./generate-translation-prompt";

const MAX_RETRIES = 3;
const logger = createServerLogger("gemini-translation");
const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_NONE,
	},
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractRetryDelayMs = (message: string) => {
	const retryDelayMatch =
		message.match(/retry in (\d+(?:\.\d+)?)s/i) ||
		message.match(/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s/i);
	if (!retryDelayMatch) return null;
	const retryDelaySeconds = Number.parseFloat(retryDelayMatch[1]);
	if (!Number.isFinite(retryDelaySeconds)) return null;
	return Math.ceil(retryDelaySeconds * 1000) + 1000;
};

export async function getGeminiModelResponse({
	geminiApiKey,
	model,
	title,
	sourceText,
	targetLocale,
	translationContext,
}: {
	geminiApiKey: string;
	model: string;
	title: string;
	sourceText: string;
	targetLocale: string;
	translationContext: string;
}) {
	const decryptedApiKey = decrypt(geminiApiKey);
	const genAI = new GoogleGenerativeAI(decryptedApiKey);
	// モデルごとの出力トークン上限
	// gemini-2.0-flash: 8,192, gemini-2.5-*: 65,535
	const maxOutputTokens = model.startsWith("gemini-2.5") ? 65535 : 8192;

	const modelConfig = genAI.getGenerativeModel({
		model,
		safetySettings,
		generationConfig: {
			responseMimeType: "application/json",
			maxOutputTokens,
			responseSchema: {
				type: SchemaType.ARRAY,
				items: {
					type: SchemaType.OBJECT,
					properties: {
						number: {
							type: SchemaType.INTEGER,
						},
						text: {
							type: SchemaType.STRING,
						},
					},
					required: ["number", "text"],
				},
			},
		},
	});
	let lastError: Error | null = null;

	for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
		try {
			const result = await modelConfig.generateContent(
				generateTranslationPrompt(
					title,
					sourceText,
					targetLocale,
					translationContext,
				),
			);
			return result.response.text();
		} catch (error: unknown) {
			const typedError = error as Error & { status?: number };
			lastError = typedError;

			// 429エラー（レート制限）の場合は、エラーレスポンスからretryDelayを抽出
			let delay = 1000 * (retryCount + 1);
			if (typedError.status === 429) {
				const retryDelayMs = extractRetryDelayMs(typedError.message);
				if (retryDelayMs) {
					delay = retryDelayMs;
					logger.warn(
						{
							attempt: retryCount + 1,
							delaySeconds: delay / 1000,
							model,
						},
						"Rate limit exceeded, using API-specified retry delay",
					);
				} else {
					// retryDelayが見つからない場合は長めの遅延を使用
					delay = 30000; // 30秒
					logger.warn(
						{
							attempt: retryCount + 1,
							model,
						},
						"Rate limit exceeded, using default 30s delay",
					);
				}
			}

			logger.error(
				{
					attempt: retryCount + 1,
					status: typedError.status,
					error_name: typedError.name,
					error_message: typedError.message,
					model,
				},
				"Gemini translation failed",
			);

			if (retryCount < MAX_RETRIES - 1) {
				logger.info(
					{ delayMs: delay, delaySeconds: delay / 1000 },
					"Retrying after delay",
				);
				await sleep(delay);
			}
		}
	}
	logger.error({ model }, "Max retries reached. Translation failed.");
	throw lastError || new Error("Translation failed after max retries");
}

export async function validateGeminiApiKey(
	apiKey: string,
): Promise<{ isValid: boolean; errorMessage?: string }> {
	try {
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

		const result = await model.generateContent("Hello, World!");
		const response = await result.response;
		const text = response.text();

		return { isValid: text.length > 0 };
	} catch (error) {
		const validationLogger = createServerLogger("gemini-api-key-validation");
		validationLogger.error(
			{
				error_name: error instanceof Error ? error.name : "Unknown",
				error_message: error instanceof Error ? error.message : String(error),
			},
			"Gemini API key validation failed",
		);
		if (
			error instanceof Error &&
			error.message.includes("The model is overloaded")
		) {
			return {
				isValid: false,
				errorMessage:
					"The model is currently overloaded. Please try again later.",
			};
		}
		return {
			isValid: false,
			errorMessage:
				"Failed to validate the API key. Please check your key and try again.",
		};
	}
}
