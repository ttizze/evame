import type { Properties } from "hast";
export interface AstNode {
	type?: string;
	text?: string;
	attrs?: Properties; // ★ ここを変更
	content?: readonly AstNode[];
}
