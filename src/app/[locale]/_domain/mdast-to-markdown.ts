import type { Root } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { JsonValue } from "@/db/types";

/** 保存済み本文をMarkdownへ変換する。変換失敗は空本文に置き換えず呼び出し元へ伝える。 */
export function mdastToMarkdown(mdastJson: JsonValue): string {
	if (mdastJson == null) return "";
	if (typeof mdastJson === "string") return mdastJson;
	if (typeof mdastJson === "number" || typeof mdastJson === "boolean")
		return String(mdastJson);

	const root = Array.isArray(mdastJson)
		? {
				type: "root" as const,
				children: mdastJson as unknown as Root["children"],
			}
		: (mdastJson as unknown as Root);
	return toMarkdown(root, { extensions: [gfmToMarkdown()] });
}
