import {
	GoogleGenerativeAI,
	HarmBlockThreshold,
	HarmCategory,
	SchemaType,
} from "@google/generative-ai";
import { decrypt } from "@/lib/encryption.server";
import { createServerLogger } from "@/lib/logger.server";
import { generateSystemMessage } from "./generate-gemini-message";

const MAX_RETRIES = 3;
const logger = createServerLogger("gemini-translation");

export async function getGeminiModelResponse({
	geminiApiKey,
	model,
	title,
	source_text,
	target_locale,
}: {
	geminiApiKey: string;
	model: string;
	title: string;
	source_text: string;
	target_locale: string;
}) {
	const decryptedApiKey = decrypt(geminiApiKey);
	const genAI = new GoogleGenerativeAI(decryptedApiKey);
	const safetySetting = [
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
	const modelConfig = genAI.getGenerativeModel({
		model: model,
		safetySettings: safetySetting,
		generationConfig: {
			responseMimeType: "application/json",
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
				generateSystemMessage(title, source_text, target_locale),
			);
			return result.response.text();
		} catch (error: unknown) {
			const typedError = error as Error & {
				status?: number;
				errorDetails?: unknown[];
			};
			lastError = typedError;

			// 429エラー（レート制限）の場合は、エラーレスポンスからretryDelayを抽出
			let delay = 1000 * (retryCount + 1);
			if (typedError.status === 429) {
				// エラーメッセージからretryDelayを抽出
				// パターン1: "Please retry in 24.775996888s."
				// パターン2: "retryDelay": "24s"
				const retryDelayMatch =
					typedError.message.match(/retry in (\d+(?:\.\d+)?)s/i) ||
					typedError.message.match(
						/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s/i,
					);
				if (retryDelayMatch) {
					const retryDelaySeconds = parseFloat(retryDelayMatch[1]);
					// 安全マージンを追加（+1秒）
					delay = Math.ceil(retryDelaySeconds * 1000) + 1000;
					logger.warn(
						{
							attempt: retryCount + 1,
							retryDelaySeconds,
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
				await new Promise((resolve) => setTimeout(resolve, delay));
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
