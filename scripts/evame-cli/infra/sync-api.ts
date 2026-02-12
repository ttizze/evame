function buildSyncApiUrl(baseUrl: string, path: string): string {
	// 入力末尾スラッシュの有無を吸収して URL を安定生成する。
	const normalized = baseUrl.trim();
	if (!normalized) {
		throw new Error("Base URL must not be empty.");
	}
	return new URL(
		path,
		normalized.endsWith("/") ? normalized : `${normalized}/`,
	).toString();
}

async function parseApiResponse<T>(
	response: Response,
	apiName: "push" | "pull",
): Promise<T> {
	// CLIで原因追跡しやすいよう、失敗時はレスポンス本文もエラーに含める。
	const json = await response.json();
	if (!response.ok) {
		throw new Error(
			`${apiName} API error: ${response.status} ${JSON.stringify(json)}`,
		);
	}
	return json as T;
}

export async function requestPush(
	baseUrl: string,
	token: string,
	payload: {
		dry_run?: boolean;
		inputs: Array<{
			slug: string;
			expected_revision: string | null;
			title: string;
			body: string;
			published_at: string | null;
		}>;
	},
	fetchImpl: typeof fetch = fetch,
): Promise<{
	status: "applied" | "no_change" | "conflict";
	results: Array<{
		slug: string;
		action: "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";
		detail?: "UPSERT";
		applied_revision?: string;
		reason?: string;
		server_revision?: string;
	}>;
}> {
	// push はローカル編集内容をサーバーへ送る。
	const url = buildSyncApiUrl(baseUrl, "/api/sync/push");
	const response = await fetchImpl(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
	return parseApiResponse<{
		status: "applied" | "no_change" | "conflict";
		results: Array<{
			slug: string;
			action: "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";
			detail?: "UPSERT";
			applied_revision?: string;
			reason?: string;
			server_revision?: string;
		}>;
	}>(response, "push");
}

export async function requestPull(
	baseUrl: string,
	token: string,
	fetchImpl: typeof fetch = fetch,
): Promise<{
	pages: Array<{
		slug: string;
		revision: string;
		title: string;
		body: string;
		published_at: string | null;
	}>;
}> {
	// pull はサーバー最新ページ群を取得する。
	const url = buildSyncApiUrl(baseUrl, "/api/sync/pull");
	const response = await fetchImpl(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	return parseApiResponse<{
		pages: Array<{
			slug: string;
			revision: string;
			title: string;
			body: string;
			published_at: string | null;
		}>;
	}>(response, "pull");
}
