import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateTranslationPrompt } from "./generate-translation-prompt";

const MAX_RETRIES = 3;
const logger = createServerLogger("openai-translation");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 翻訳結果のスキーマ（OpenAI APIはrootがobjectである必要がある）
const translationSchema = z.object({
	translations: z.array(
		z.object({
			number: z.number(),
			text: z.string(),
		}),
	),
});

export async function getOpenAIModelResponse({
	apiKey,
	model,
	title,
	sourceText,
	targetLocale,
	translationContext,
}: {
	apiKey: string;
	model: string;
	title: string;
	sourceText: string;
	targetLocale: string;
	translationContext: string;
}) {
	// 入力JSON行数をカウント
	const inputLineCount = sourceText.split("\n").length;

	const openai = createOpenAI({
		apiKey,
	});

	let lastError: Error | null = null;

	for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
		try {
			const { object } = await generateObject({
				model: openai(model),
				schema: translationSchema,
				schemaName: "TranslationResponse",
				schemaDescription:
					"Array of translated text segments with their original numbers",
				prompt: generateTranslationPrompt(
					title,
					sourceText,
					targetLocale,
					translationContext,
				),
			});

			if (!object?.translations || object.translations.length === 0) {
				throw new Error("Empty response from OpenAI");
			}

			return JSON.stringify(object.translations);
		} catch (error: unknown) {
			const typedError = error as Error;
			logger.error(
				{
					attempt: retryCount + 1,
					input_count: inputLineCount,
					error_name: typedError.name,
					error_message: typedError.message,
				},
				"OpenAI translation failed",
			);
			lastError = typedError;

			if (retryCount < MAX_RETRIES - 1) {
				const delay = 1000 * (retryCount + 1);
				await sleep(delay);
			}
		}
	}

	logger.error({ input_count: inputLineCount }, "Max retries reached");
	throw lastError || new Error("OpenAI translation failed after max retries");
}
