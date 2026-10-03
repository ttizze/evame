import { generateTranslationPrompt } from "./generate-translation-prompt";
import { getGoogleAccessToken } from "./google-auth";

const MAX_RETRIES = 3;

const safetySettings = [
	{
		category: "HARM_CATEGORY_HARASSMENT",
		threshold: "BLOCK_ONLY_HIGH",
	},
	{
		category: "HARM_CATEGORY_HATE_SPEECH",
		threshold: "BLOCK_ONLY_HIGH",
	},
	{
		category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
		threshold: "BLOCK_ONLY_HIGH",
	},
	{
		category: "HARM_CATEGORY_DANGEROUS_CONTENT",
		threshold: "BLOCK_ONLY_HIGH",
	},
];

export async function getVertexAIModelResponse({
	model,
	title,
	sourceText,
	targetLocale,
	translationContext,
}: {
	model: string;
	title: string;
	sourceText: string;
	targetLocale: string;
	translationContext: string;
}) {
	const location = process.env.GCP_REGION || "us-central1";
	const hostname =
		location === "global"
			? "aiplatform.googleapis.com"
			: `${location}-aiplatform.googleapis.com`;
	const url = `https://${hostname}/v1/projects/${encodeURIComponent(process.env.GCP_PROJECT_ID ?? "")}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
	const body = JSON.stringify({
		contents: [
			{
				role: "user",
				parts: [
					{
						text: generateTranslationPrompt(
							title,
							sourceText,
							targetLocale,
							translationContext,
						),
					},
				],
			},
		],
		safetySettings,
		generationConfig: {
			responseMimeType: "application/json",
			maxOutputTokens: model.startsWith("gemini-2.5") ? 65535 : 8192,
			responseSchema: {
				type: "ARRAY",
				items: {
					type: "OBJECT",
					properties: {
						number: {
							type: "INTEGER",
						},
						text: {
							type: "STRING",
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
			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${await getGoogleAccessToken()}`,
					"Content-Type": "application/json",
				},
				body,
			});
			if (!response.ok)
				throw new Error(`Vertex AI request failed (${response.status})`);
			const res = (await response.json()) as {
				candidates?: { content?: { parts?: { text?: string }[] } }[];
			};
			const jsonText =
				res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
			if (!jsonText) {
				throw new Error("Empty response from Vertex AI");
			}
			return jsonText;
		} catch (error: unknown) {
			lastError =
				error instanceof Error ? error : new Error("Vertex AI request failed");

			if (retryCount < MAX_RETRIES - 1) {
				// 429エラー（レート制限）の場合は長めの遅延
				const errorMessage = lastError.message || "";
				const is429 =
					errorMessage.includes("429") ||
					errorMessage.includes("RESOURCE_EXHAUSTED");
				const delay = is429 ? 30000 : 1000 * (retryCount + 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	throw lastError || new Error("Translation failed after max retries");
}
