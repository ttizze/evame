import {
	HarmBlockThreshold,
	HarmCategory,
	SchemaType,
	VertexAI,
} from "@google-cloud/vertexai";
import { generateTranslationPrompt } from "./generate-translation-prompt";
import { getAuthClient } from "./google-auth";

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
];

type VertexTranslationParams = {
	model: string;
	title: string;
	sourceText: string;
	targetLocale: string;
	translationContext: string;
};

export async function getVertexAIModelResponse({
	model,
	title,
	sourceText,
	targetLocale,
	translationContext,
}: VertexTranslationParams) {
	const authClient = await getAuthClient();
	const vertexai = new VertexAI({
		project: process.env.GCP_PROJECT_ID,
		location: process.env.GCP_REGION,
		googleAuthOptions: {
			// authClientが存在する場合（Vercel環境）はOIDCトークンを使用
			// authClientがundefinedの場合（ローカル開発時）はauthClientを渡さず、
			// VertexAIが自動的にApplication Default Credentialsを使用する
			...(authClient && {
				// biome-ignore lint/suspicious/noExplicitAny: <vertexaiの型がおかしい>
				authClient: authClient as any,
			}),
			projectId: process.env.GCP_PROJECT_ID,
		},
	});
	// モデルごとの出力トークン上限
	// gemini-2.0-flash: 8,192, gemini-2.5-*: 65,535
	const maxOutputTokens = model.startsWith("gemini-2.5") ? 65535 : 8192;

	const modelConfig = vertexai.getGenerativeModel({
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
			const res = await modelConfig.generateContent(
				generateTranslationPrompt(
					title,
					sourceText,
					targetLocale,
					translationContext,
				),
			);
			const jsonText =
				res.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
			if (!jsonText) {
				throw new Error("Empty response from Vertex AI");
			}
			return jsonText;
		} catch (error: unknown) {
			lastError = error as Error;

			if (retryCount < MAX_RETRIES - 1) {
				// 429エラー（レート制限）の場合は長めの遅延
				const errorMessage = lastError.message || "";
				const is429 =
					errorMessage.includes("429") ||
					errorMessage.includes("RESOURCE_EXHAUSTED");
				const delay = is429 ? 30000 : 1000 * (retryCount + 1);
				await sleep(delay);
			}
		}
	}
	throw lastError || new Error("Translation failed after max retries");
}
