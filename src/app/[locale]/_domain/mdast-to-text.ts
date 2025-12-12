import type { Root as MdastRoot, RootContent } from "mdast";

/**
 * MDASTノード（RootまたはRootContent）をテキストに変換
 *
 * DrizzleスキーマではmdastJsonはMdastRoot型として定義されている。
 * 再帰的な処理のため、RootContent型やRootContent[]も受け入れる。
 */
export async function mdastToText(
	mdastJson: MdastRoot | RootContent | RootContent[] | null,
): Promise<string> {
	if (mdastJson == null) return "";

	// ① 文字列・数値・真偽はそのまま／文字列化
	if (typeof mdastJson === "string") return mdastJson;
	if (typeof mdastJson === "number" || typeof mdastJson === "boolean")
		return String(mdastJson);

	// ② 配列の場合は各要素を再帰処理
	if (Array.isArray(mdastJson)) {
		const results = await Promise.all(
			mdastJson.map((item) => mdastToText(item)),
		);
		return results.join("");
	}

	// オブジェクト（MDAST ノード）の処理
	if (typeof mdastJson === "object") {
		// Root型またはRootContent型のノード
		const node = mdastJson as MdastRoot | RootContent;

		// text, inlineCode など: { value: "..." }
		if ("value" in node && typeof node.value === "string") {
			return node.value;
		}

		// 画像キャプション・リンクタイトルなど alt/title にも文字列がある場合
		if ("alt" in node && typeof node.alt === "string") {
			return node.alt;
		}
		if ("title" in node && typeof node.title === "string") {
			return node.title;
		}

		// 子ノードを下る（Root型と多くのRootContent型はchildrenを持つ）
		if ("children" in node && Array.isArray(node.children)) {
			const results = await Promise.all(
				node.children.map((child) => mdastToText(child as RootContent)),
			);
			return results.join("");
		}
	}

	// それ以外は無視
	return "";
}
