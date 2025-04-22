import type { AstNode } from "@/app/types/ast-node";
import { describe, expect, test } from "vitest";
import { detectLocale } from "./detect-locale";

/** paragraph 配列から最小構成の AstNode を生成 */
function makeDoc(...paragraphs: string[]): AstNode {
	return {
		type: "doc",
		content: paragraphs.map((text) => ({
			type: "paragraph",
			content: [{ type: "text", text }],
		})),
	};
}

describe("detectLocale ‑ Other Languages", () => {
	const cases = [
		{
			name: "English (long)",
			expected: "en",
			paragraphs: [
				"This is a long paragraph in English to test whether cld3‑asm or similar libraries can correctly identify the primary language when given a fair amount of text. Having multiple sentences with varied vocabulary helps the detector reliably classify the language as English.",
				"One day, as I wandered through the streets of London, I found myself enchanted by the rich tapestry of history that wove itself into every stone and corner of the city. There were monuments and statues commemorating heroes of the past, as well as modern architecture that stood as a testament to the progress of civilization.",
			],
		},
		{
			name: "Spanish (long)",
			expected: "es",
			paragraphs: [
				"Este es un párrafo más extenso en español para comprobar si la librería reconoce correctamente el idioma principal. Al incluir varias oraciones con un vocabulario variado, esperamos que el detector identifique el español sin problemas.",
				"Un día, mientras caminaba por las calles de Madrid, descubrí la influencia de la arquitectura antigua mezclada con los edificios modernos. La cultura española, reflejada en sus plazas y cafés, enriquecía cada rincón de la ciudad con su música, gastronomía y calidez humana.",
			],
		},
		{
			name: "Japanese (long)",
			expected: "ja",
			paragraphs: [
				"これは日本語の長めの文章です。日本語の文章を豊富に用意することで、cld3‑asm などのライブラリがしっかりと日本語を判定できる可能性が高まります。また、同じフレーズを繰り返すのではなく、いろいろな表現を使うことが望ましいです。",
				"昔々あるところに、おじいさんとおばあさんが住んでいました。おじいさんは山へ柴刈りに、おばあさんは川へ洗濯に行きました。すると川上から大きな桃が一つどんぶらこ、どんぶらこと流れてきました。",
				"おばあさんがその桃を拾い上げて持ち帰ると、中から元気な男の子が飛び出してきました。男の子は桃太郎と名付けられ、すくすく育っていきました。やがて桃太郎は、鬼退治を決意して仲間とともに鬼ヶ島へ向かいます。",
				"こういった昔話の一節を含む長文を使うことで、十分なテキスト量を確保し、言語判定の精度を上げることができます。",
			],
		},
	] as const;

	test.each(cases)("$name", async ({ paragraphs, expected }) => {
		const doc = makeDoc(...paragraphs);
		const detected = await detectLocale(doc, "und");
		expect(detected).toBe(expected);
	});

	test("Mixed English + Spanish ‑ detect dominant language", async () => {
		const paragraphs = [
			"This paragraph starts in English, but then it switches to Spanish to see how the language detector behaves. Vamos a ver si el detector de idioma logra identificar correctamente qué lengua domina en este texto.",
			"The content is mostly written in English, but with a fair number of Spanish sentences sprinkled throughout. ¿Será suficiente para confundir al sistema o detectará el idioma predominante?",
		];
		const doc = makeDoc(...paragraphs);
		const detected = await detectLocale(doc, "und");
		expect(["en", "es"]).toContain(detected);
	});
});
