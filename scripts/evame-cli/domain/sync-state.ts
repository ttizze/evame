export function buildPushRequest(
	localFiles: Array<{
		slug: string;
		title: string;
		body: string;
		published_at: string | null;
	}>,
	state: {
		slugs: Record<string, { last_applied_revision: string }>;
	},
	dryRun: boolean,
) {
	const inputs: Array<{
		slug: string;
		expected_revision: string | null;
		title: string;
		body: string;
		published_at: string | null;
	}> = [];

	// プラットフォーム差分を避けるため、slug 順で固定する。
	for (const file of [...localFiles].sort((a, b) =>
		a.slug.localeCompare(b.slug),
	)) {
		// 既知 revision を expected_revision に入れて競合検知に使う。
		const expected = state.slugs[file.slug]?.last_applied_revision ?? null;
		inputs.push({
			slug: file.slug,
			expected_revision: expected,
			title: file.title,
			body: file.body,
			published_at: file.published_at,
		});
	}

	if (dryRun) {
		// dry-run ではサーバーに「書き込みなし」であることを明示する。
		return { dry_run: true, inputs };
	}
	return { inputs };
}

export function applyPushResultToState(
	state: {
		slugs: Record<string, { last_applied_revision: string }>;
	},
	response: {
		status: "applied" | "no_change" | "conflict";
		results: Array<{
			slug: string;
			action: "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";
			detail?: "UPSERT";
			applied_revision?: string;
			reason?: string;
			server_revision?: string;
		}>;
	},
	dryRun: boolean,
) {
	if (dryRun) {
		// dry-run ではローカル state を変更しない。
		return { slugs: { ...state.slugs } };
	}

	const next = { slugs: { ...state.slugs } };
	for (const row of response.results) {
		// 自動適用された行だけを state へ反映する。
		if (row.action !== "AUTO_APPLY") continue;
		if (row.applied_revision) {
			next.slugs[row.slug] = { last_applied_revision: row.applied_revision };
		}
	}

	return next;
}
