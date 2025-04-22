import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import type { AstNode } from "@/app/types/ast-node";
import { canonicalize } from "./text-utils";

export interface SegmentDraft {
	hash: string;
	text: string;
	order: number; // 0=タイトル, 100,200…
}

const GAP = 100;
/** AstNode を走査して ①hash 付与 ②SegmentDraft[] 生成 */
export function collectSegments({
	root,
	header,
}: {
	root: AstNode;
	header?: string;
}): { segments: SegmentDraft[]; jsonWithHash: AstNode } {
	const cloned: AstNode = structuredClone(root);
	const occ = new Map<string, number>();
	const segments: SegmentDraft[] = [];

	/* 見出し (タイトル等) */
	if (header?.trim()) {
		const hash = generateHashForText(header, 0);
		segments.push({ hash, text: header, order: 0 });
		occ.set(canonicalize(header), 0);
	}

	/* 本文 DFS */
	let order = GAP;
	(function walk(node: AstNode): void {
		if (node.type === "text" && node.text?.trim()) {
			const canon = canonicalize(node.text);
			const n = (occ.get(canon) ?? 0) + 1;
			occ.set(canon, n);

			const hash = generateHashForText(node.text, n);
			node.attrs = { ...(node.attrs ?? {}), hash }; // ← ここで付与
			segments.push({ hash, text: node.text, order });
			order += GAP;
		}
		for (const c of node.content ?? []) {
			walk(c);
		}
	})(cloned);

	return { segments, jsonWithHash: cloned };
}
