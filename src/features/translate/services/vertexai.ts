// import {
// 	HarmBlockThreshold,
// 	HarmCategory,
// 	SchemaType,
// 	VertexAI,
// } from "@google-cloud/vertexai";
// import { generateSystemMessage } from "./generate-gemini-message";

// const MAX_RETRIES = 3;
// interface VertexAIResponse {
// 	candidates: Array<{
// 		content: {
// 			parts: Array<{
// 				text: string;
// 			}>;
// 		};
// 	}>;
// }
// export async function getVertexAIModelResponse(
// 	model: string,
// 	title: string,
// 	source_text: string,
// 	target_language: string,
// ) {
// 	const vertexai = new VertexAI({
// 		project: process.env.VERTEXAI_PROJECT_ID,
// 		location: process.env.VERTEXAI_REGION,
// 	});
// 	const apiEndpoint = `https://${process.env.VERTEXAI_REGION}-aiplatform.googleapis.com/v1/projects/${process.env.VERTEXAI_PROJECT_ID}/locations/${process.env.VERTEXAI_REGION}/publishers/google/models/${model}:generateContent`;

// 	const safetySetting = [
// 		{
// 			category: HarmCategory.HARM_CATEGORY_HARASSMENT,
// 			threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
// 		},
// 		{
// 			category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
// 			threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
// 		},
// 		{
// 			category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
// 			threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
// 		},
// 		{
// 			category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
// 			threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
// 		},
// 	];
// 	const modelConfig = vertexai.getGenerativeModel({
// 		model: model,
// 		safetySettings: safetySetting,
// 		generationConfig: {
// 			responseMimeType: "application/json",
// 			responseSchema: {
// 				type: SchemaType.ARRAY,
// 				items: {
// 					type: SchemaType.OBJECT,
// 					properties: {
// 						number: {
// 							type: SchemaType.INTEGER,
// 						},
// 						text: {
// 							type: SchemaType.STRING,
// 						},
// 					},
// 					required: ["number", "text"],
// 				},
// 			},
// 		},
// 	});
// 	let lastError: Error | null = null;

// 	for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
// 		try {
// 			const result = await modelConfig.generateContent(
// 				generateSystemMessage(title, source_text, target_language),
// 			);
// 			return JSON.stringify(result.response);
// 		} catch (error: unknown) {
// 			const typedError = error as Error;
// 			console.error(
// 				`Translation attempt ${retryCount + 1} failed:`,
// 				typedError,
// 			);
// 			lastError = typedError;

// 			if (retryCount < MAX_RETRIES - 1) {
// 				const delay = 1000 * (retryCount + 1);
// 				console.log(`Retrying in ${delay / 100} seconds...`);
// 				await new Promise((resolve) => setTimeout(resolve, delay));
// 			}
// 		}
// 	}
// 	console.error("Max retries reached. Translation failed.");
// 	throw lastError || new Error("Translation failed after max retries");
// }
