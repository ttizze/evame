import type { Root } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { JsonValue } from "@/db/types";

/** 既存の空オブジェクトは空本文として扱い、内容の変換失敗は呼び出し元へ伝える。 */
export function mdastToMarkdown(mdastJson: JsonValue): string {
	if (mdastJson == null) return "";
	if (typeof mdastJson === "string") return mdastJson;
	if (typeof mdastJson === "number" || typeof mdastJson === "boolean")
		return String(mdastJson);
	if (!Array.isArray(mdastJson) && Object.keys(mdastJson).length === 0)
		return "";

	const root = Array.isArray(mdastJson)
		? {
				type: "root" as const,
				children: mdastJson as unknown as Root["children"],
			}
		: (mdastJson as unknown as Root);
	return toMarkdown(root, { extensions: [gfmToMarkdown()] });
}
