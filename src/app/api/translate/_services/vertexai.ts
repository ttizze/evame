import {
	HarmBlockThreshold,
	HarmCategory,
	SchemaType,
	VertexAI,
} from "@google-cloud/vertexai";
import { getAuthClient } from "@/lib/google-auth";
import { generateSystemMessage } from "./generate-gemini-message";

const MAX_RETRIES = 3;
export async function getVertexAIModelResponse(
	model: string,
	title: string,
	source_text: string,
	target_language: string,
) {
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
	const safetySetting = [
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
	const modelConfig = vertexai.getGenerativeModel({
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
			const res = await modelConfig.generateContent(
				generateSystemMessage(title, source_text, target_language),
			);
			// ──────────────────────────────────────────────

			// ★★ ここがポイント：テキストだけ抜く ★★
			const jsonText =
				res.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
			return jsonText;
		} catch (error: unknown) {
			const typedError = error as Error;
			console.error(
				`Translation attempt ${retryCount + 1} failed:`,
				typedError,
			);
			lastError = typedError;

			if (retryCount < MAX_RETRIES - 1) {
				const delay = 1000 * (retryCount + 1);
				console.log(`Retrying in ${delay / 1000} seconds...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	console.error("Max retries reached. Translation failed.");
	throw lastError || new Error("Translation failed after max retries");
}
