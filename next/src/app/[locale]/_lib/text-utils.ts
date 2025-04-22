import type { AstNode } from "@/app/types/ast-node";

export function extractPlainText(node: AstNode): string {
	if (node.type === "text") return node.text ?? "";
	if (Array.isArray(node.content))
		return node.content.map(extractPlainText).join(" ");
	return "";
}
export function canonicalize(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/\s+/g, " ")
		.trim()
		.normalize("NFC");
}
