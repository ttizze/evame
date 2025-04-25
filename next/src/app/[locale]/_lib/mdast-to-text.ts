import type { Prisma } from "@prisma/client";

export async function mdastToText(n: Prisma.JsonValue): Promise<string> {
	if (n == null) return "";

	// ① 文字列・数値・真偽はそのまま／文字列化
	if (typeof n === "string") return n;
	if (typeof n === "number" || typeof n === "boolean") return String(n);

	// ② 配列は各要素を再帰
	if (Array.isArray(n)) return n.map(mdastToText).join("");

	// ③ オブジェクト（MDAST ノード）の処理
	if (typeof n === "object") {
		const node = n as Record<string, Prisma.JsonValue>;

		// text, inlineCode など: { value: "..." }
		if (typeof node.value === "string") return node.value;

		// 画像キャプション・リンクタイトルなど alt/title にも文字列がある場合
		if (typeof node.alt === "string") return node.alt;
		if (typeof node.title === "string") return node.title;

		// 子ノードを下る
		if (Array.isArray(node.children)) {
			return (node.children as Prisma.JsonValue[]).map(mdastToText).join("");
		}
	}

	// ④ それ以外は無視
	return "";
}
