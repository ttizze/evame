// import { OpenAI } from "openai/index.mjs";
// import type { TranslationRequestBody } from "../schemas/translation-request.js";
// import { generateSystemMessage } from "./generateAnthropicSystemMessage.js";

// export async function createTranslation(
// 	apiKey: string | undefined,
// 	body: TranslationRequestBody,
// ) {
// 	console.log("createTranslation", body);
// 	if (!apiKey || typeof apiKey !== "string") {
// 		throw new Error("OPENAI_API_KEY is not set");
// 	}

// 	const openai = new OpenAI({
// 		apiKey,
// 		baseURL:
// 			"https://gateway.ai.cloudflare.com/v1/c7b7a7ae01fa84965620a5b3f7e79286/steelo/openai",
// 	});

// 	const chatStream = await openai.chat.completions.create({
// 		messages: [
// 			{
// 				role: "system",
// 				content: generateSystemMessage(body),
// 			},
// 			{
// 				role: "user",
// 				content: body.source_text,
// 			},
// 		],
// 		model: "gpt-4-turbo",
// 		stream: true,
// 		temperature: 0,
// 		top_p: 1,
// 	});

// 	return chatStream;
// }
