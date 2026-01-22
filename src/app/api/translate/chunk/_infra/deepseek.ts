import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateOpenAISystemMessage } from "./generate-openai-message";

const MAX_RETRIES = 3;
const logger = createServerLogger("deepseek-translation");

// 翻訳結果のスキーマ（DeepSeekは配列を直接返す）
const translationSchema = z.array(
	z.object({
		number: z.number(),
		text: z.string(),
	}),
);

export async function getDeepSeekModelResponse({
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

	const deepseek = createDeepSeek({
		apiKey,
	});

	let lastError: Error | null = null;

	for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
		try {
			const result = await generateObject({
				model: deepseek(model),
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

			if (!result.object || result.object.length === 0) {
				throw new Error("Empty response from DeepSeek");
			}

			return JSON.stringify(result.object);
		} catch (error: unknown) {
			const typedError = error as Error;
			logger.error(
				{
					attempt: retryCount + 1,
					input_count: inputCount,
					error_name: typedError.name,
					error_message: typedError.message,
					error_stack: typedError.stack,
				},
				"DeepSeek translation failed",
			);
			lastError = typedError;

			if (retryCount < MAX_RETRIES - 1) {
				const delay = 1000 * (retryCount + 1);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	logger.error({ input_count: inputCount }, "Max retries reached");
	throw lastError || new Error("DeepSeek translation failed after max retries");
}
