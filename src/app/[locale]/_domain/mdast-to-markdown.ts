import type { Root } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { JsonValue } from "@/db/types";

function toRoot(mdastJson: JsonValue): Root | null {
	if (mdastJson == null) return null;
	if (typeof mdastJson !== "object") return null;
	if (Array.isArray(mdastJson)) {
		return {
			type: "root",
			children: mdastJson as unknown as Root["children"],
		};
	}
	return mdastJson as unknown as Root;
}

export function mdastToMarkdown(mdastJson: JsonValue): string {
	if (mdastJson == null) return "";
	if (typeof mdastJson === "string") return mdastJson;
	if (typeof mdastJson === "number" || typeof mdastJson === "boolean")
		return String(mdastJson);

	const root = toRoot(mdastJson);
	if (!root) return "";

	try {
		return toMarkdown(root, { extensions: [gfmToMarkdown()] });
	} catch {
		return "";
	}
}
