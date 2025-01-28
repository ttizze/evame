import { loadModule } from "cld3-asm";

// Markdown版
export async function getMarkdownSourceLocale(
	markdownContent: string,
	title: string,
): Promise<string> {
	// 1. コードブロックやインラインコード等を除去
	//    ここでは3重バッククォートのブロックや、`インラインコード` をすべて削除する例。
	const cleanedMarkdown = markdownContent
		// ```...``` のコードブロックを除去
		.replace(/```[\s\S]*?```/g, "")
		// `...` のインラインコードを除去
		.replace(/`[^`]*`/g, "")
		// リンク文字列 [text](url) などを除去するなら以下も検討
		// .replace(/\[.*?\]\(.*?\)/g, "")

		// 改行を適宜整形 (不要であれば不要)
		.trim();

	// 2. タイトルも含めて一括で判定用テキストを作る
	const combinedText = [title.trim(), cleanedMarkdown].join("\n\n");

	let cld = null;
	try {
		const cldFactory = await loadModule();
		cld = cldFactory.create();

		// 4. 言語を判定
		const result = await cld.findLanguage(combinedText);
		const languageCode = result?.language || "und";
		return languageCode;
	} catch (error) {
		console.error("Error detecting language:", error);
		return "und";
	} finally {
		if (cld) {
			cld.dispose();
		}
	}
}
