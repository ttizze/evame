import { describe, expect, it } from "vitest";
import { generateTranslationPrompt } from "./prompt";

describe("翻訳prompt", () => {
	it("旧Evameの翻訳指示・表示言語名・セグメント番号を維持する", () => {
		const prompt = generateTranslationPrompt({
			model: "gemini-2.5-flash-lite",
			targetLocale: "fr",
			title: "Dhammapada",
			segments: [{ id: 1, number: 0, text: "Appamādena sampādetha" }],
			translationContext: "Use established Buddhist terminology.",
		});

		expect(prompt).toContain(
			"You are a skilled translator. Your task is to accurately translate the given text into beautiful and natural sentences in the target language.",
		);
		expect(prompt).toContain(
			"6. User instructions: Follow these additional translation guidelines",
		);
		expect(prompt).toContain('"Use established Buddhist terminology."');
		expect(prompt).toContain("Document title: Dhammapada");
		expect(prompt).toContain("into Français");
		expect(prompt).toContain('{"number":0,"text":"Appamādena sampādetha"}');
		expect(prompt).toContain("Output ONLY the translated JSON array");
	});
});
