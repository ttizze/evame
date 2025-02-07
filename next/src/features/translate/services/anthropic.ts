// import Anthropic from "@anthropic-ai/sdk";
// import { generateSystemMessage } from "./generateAnthropicSystemMessage";

// export async function callAnthropic(
// 	apiKey: string | undefined,
// 	body: TranslationRequest,
// ): Promise<Anthropic.Messages.Message> {
// 	console.log("createTranslation", body);
// 	if (!apiKey || typeof apiKey !== "string") {
// 		throw new Error("ANTHROPIC_API_KEY is not set");
// 	}

// 	const client = new Anthropic({
// 		apiKey: apiKey,
// 	});

// 	const model = "claude-3-haiku-20240307";
// 	return await client.messages.create({
// 		messages: [{ role: "user", content: generateSystemMessage(body) }],
// 		model: model,
// 		temperature: 0,
// 	});
// }
