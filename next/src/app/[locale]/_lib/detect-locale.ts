import { extractPlainText } from "@/app/[locale]/_lib/text-utils";
import type { AstNode } from "@/app/types/ast-node";
import { loadModule } from "cld3-asm";

/**
 * TipTap / Lexical / 汎用 AstNode を受け取り
 * 言語を判定（失敗時は userLocale を返す）
 */
export async function detectLocale(
	content: string | unknown,
	fallback: string,
): Promise<string> {
	// 1. 文字列なら JSON.parse
	let node: AstNode;
	if (typeof content === "string") {
		try {
			node = JSON.parse(content);
		} catch {
			return fallback;
		}
	} else {
		node = content as AstNode;
	}

	// 2. プレーンテキスト抽出
	const plain = extractPlainText(node);

	// 3. cld3 で判定
	let detector: ReturnType<
		Awaited<ReturnType<typeof loadModule>>["create"]
	> | null = null;
	try {
		detector = (await loadModule()).create();
		const { language = "und" } = detector.findLanguage(plain);
		return language !== "und" ? language : fallback;
	} catch {
		return fallback;
	} finally {
		detector?.dispose();
	}
}
