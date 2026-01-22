import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateOpenAISystemMessage } from "./generate-openai-message";

const MAX_RETRIES = 3;
const logger = createServerLogger("openai-translation");

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
	source_text,
	target_locale,
	translationContext,
}: {
	apiKey: string;
	model: string;
	title: string;
	source_text: string;
	target_locale: string;
	translationContext: string;
}) {
	// 入力JSON行数をカウント
	const inputCount = source_text.split("\n").length;

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
				prompt: generateOpenAISystemMessage(
					title,
					source_text,
					target_locale,
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
					input_count: inputCount,
					error_name: typedError.name,
					error_message: typedError.message,
				},
				"OpenAI translation failed",
			);
			lastError = typedError;

			if (retryCount < MAX_RETRIES - 1) {
				const delay = 1000 * (retryCount + 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	logger.error({ input_count: inputCount }, "Max retries reached");
	throw lastError || new Error("OpenAI translation failed after max retries");
}
