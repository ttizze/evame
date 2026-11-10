import type { PageStatus } from "@/db/types";

/**
 * アプリから送られた文書の書き込みを、サーバーの現在の文書と照らして判定する。
 * 送られた内容と現在の内容が同じなら、版が古くても変更なしとして扱い、応答を失った再送を回復できるようにする。
 */
export function judgeDocumentWrite(input: {
	page: { owned: boolean; status: PageStatus; revision: string } | null;
	expectedRevision: string | null;
	incomingRevision: string;
}):
	| { action: "create" | "update" | "unchanged" }
	| {
			action: "conflict";
			reason: "missing" | "slug_taken" | "archived" | "revision_mismatch";
	  } {
	const { page, expectedRevision, incomingRevision } = input;
	if (!page)
		return expectedRevision === null
			? { action: "create" }
			: { action: "conflict", reason: "missing" };
	if (!page.owned) return { action: "conflict", reason: "slug_taken" };
	if (page.status === "ARCHIVE")
		return { action: "conflict", reason: "archived" };
	if (page.revision === incomingRevision) return { action: "unchanged" };
	if (page.revision === expectedRevision) return { action: "update" };
	return { action: "conflict", reason: "revision_mismatch" };
}
