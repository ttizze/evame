// import { VertexAI } from "@google-cloud/vertexai";
// import { generateSystemMessage } from "./generate-gemini-message";

// export async function getVertexAIModelResponse(
// 	title: string,
// 	source_text: string,
// 	target_language: string,
// ): Promise<string> {
// 	const modelId = "gemini-1.5-pro-001";
// 	const vertexAI = new VertexAI({
// 		project: process.env.PROJECT_NAME,
// 		location: process.env.REGION,
// 	});
// 	const modelConfig = vertexAI.getGenerativeModel({
// 		model: modelId,
// 		generationConfig: {
// 			responseMimeType: "application/json",
// 		},
// 	});
// 	const requestData = {
// 		contents: [
// 			{
// 				role: "user",
// 				parts: [
// 					{ text: generateSystemMessage(title, source_text, target_language) },
// 				],
// 			},
// 		],
// 	};

// 	try {
// 		const result = await modelConfig.generateContent(requestData);
// 		const response = result.response;
// 		console.log("Response: ", JSON.stringify(response));
// 		return response.candidates?.[0]?.content.parts[0].text || "";
// 	} catch (error) {
// 		console.error("Error calling Gemini API:", error);
// 		throw error;
// 	}
// }
