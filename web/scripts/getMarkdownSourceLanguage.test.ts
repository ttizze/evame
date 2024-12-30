import { getMarkdownSourceLanguage } from "./getMarkdownSourceLanguage";

describe("getMarkdownSourceLanguage", () => {
	it("英語のMarkdownコンテンツを与えると 'en' が返る", async () => {
		const markdownContent = `
# Hello World

\`\`\`js
console.log("this is code block");
\`\`\`

 This is a long paragraph in English to test whether cld3-asm or similar
        libraries can correctly identify the primary language when given a fair
        amount of text. Having multiple sentences with varied vocabulary helps
        the detector reliably classify the language as English.
    `;
		const title = "My Page Title in English";

		const detectedLanguage = await getMarkdownSourceLanguage(
			markdownContent,
			title,
		);

		expect(detectedLanguage).toBe("en");
	});

	it("空のコンテンツを与えた場合は 'und' が返る", async () => {
		const markdownContent = "";
		const title = "";

		const detectedLanguage = await getMarkdownSourceLanguage(
			markdownContent,
			title,
		);

		expect(detectedLanguage).toBe("und");
	});

	it("日本語のコンテンツを与えると 'ja' が返る（想定）", async () => {
		const markdownContent = `
# サンプルタイトル

\`インラインコード\`

   これは日本語の長めの文章です。日本語の文章を豊富に用意することで、
        cld3-asm などのライブラリがしっかりと日本語を判定できる可能性が高まります。
        また、同じフレーズを繰り返すのではなく、いろいろな表現を使うことが望ましいです。
    `;
		const title = "テストページのタイトル";

		const detectedLanguage = await getMarkdownSourceLanguage(
			markdownContent,
			title,
		);

		// 'ja' または近いコードが返る想定。
		expect(detectedLanguage).toBe("ja");
	});
});
