export type SyncAction = "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";

export type ConflictReason =
	| "content_conflict"
	| "revision_mismatch"
	| "archived_page";

/**
 * CLI同期の判定ロジック（純粋関数）
 *
 * サーバーDBの状態と入力を比較して、適用/変更なし/競合を判定する。
 */
export function judgeSyncInput(input: {
	serverState: "MISSING" | "ACTIVE" | "ARCHIVED";
	expectedState: "NONE" | "MATCH" | "MISMATCH";
	sameContent: boolean;
}): {
	action: SyncAction;
	detail?: "UPSERT";
	reason?: ConflictReason;
} {
	// ARCHIVE は CLI では変更しない（ダッシュボード操作のみ）
	if (input.serverState === "ARCHIVED") {
		return { action: "CONFLICT", reason: "archived_page" };
	}

	// slug未使用は新規作成
	if (input.serverState === "MISSING") {
		return { action: "AUTO_APPLY", detail: "UPSERT" };
	}

	if (input.expectedState === "NONE") {
		if (input.sameContent) {
			return { action: "NO_CHANGE" };
		}
		return { action: "CONFLICT", reason: "content_conflict" };
	}

	if (input.expectedState === "MISMATCH") {
		return { action: "CONFLICT", reason: "revision_mismatch" };
	}

	if (input.sameContent) {
		return { action: "NO_CHANGE" };
	}

	return { action: "AUTO_APPLY", detail: "UPSERT" };
}
