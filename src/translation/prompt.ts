import type { ProviderTranslationInput } from "./types";

/**
 * 翻訳プロバイダーへ渡す指示を一箇所で組み立てる。
 * 原文の順序と number を維持させ、JSON以外の出力を受け取らない契約にする。
 */
export function generateTranslationPrompt(
	input: ProviderTranslationInput,
): string {
	const source = input.segments
		.map((segment) =>
			JSON.stringify({ number: segment.number, text: segment.text }),
		)
		.join("\n");
	const context = input.translationContext.trim();

	return [
		"You translate Buddhist scripture segments for a global multilingual reader.",
		`Target locale: ${input.targetLocale}`,
		`Scripture title: ${input.title || "(untitled)"}`,
		context ? `Additional translator context:\n${context}` : "",
		"Preserve the meaning, register, names, and segment boundaries. Do not add commentary.",
		"Return only a JSON object with a translations array. Each item must have the original number and translated text.",
		"Do not omit, reorder, duplicate, or invent segment numbers.",
		"Source segments:",
		source,
	]
		.filter((line) => line.length > 0)
		.join("\n\n");
}
