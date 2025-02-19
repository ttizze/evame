import { decrypt } from "@/lib/encryption.server";
import {
	GoogleGenerativeAI,
	HarmBlockThreshold,
	HarmCategory,
	SchemaType,
} from "@google/generative-ai";
import { generateSystemMessage } from "./generate-gemini-message";
const MAX_RETRIES = 3;

export async function getGeminiModelResponse(
	geminiApiKey: string,
	model: string,
	title: string,
	source_text: string,
	target_locale: string,
) {
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
			const typedError = error as Error;
			console.error(
				`Translation attempt ${retryCount + 1} failed:`,
				typedError,
			);
			lastError = typedError;

			if (retryCount < MAX_RETRIES - 1) {
				const delay = 1000 * (retryCount + 1);
				console.log(`Retrying in ${delay / 100} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	console.error("Max retries reached. Translation failed.");
	throw lastError || new Error("Translation failed after max retries");
}

export async function validateGeminiApiKey(
	apiKey: string,
): Promise<{ isValid: boolean; errorMessage?: string }> {
	try {
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: "gemini-pro" });

		const result = await model.generateContent("Hello, World!");
		const response = await result.response;
		const text = response.text();

		return { isValid: text.length > 0 };
	} catch (error) {
		console.error("Gemini API key validation failed:", error);
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
