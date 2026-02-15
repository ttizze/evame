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
	const raw = await response.text();
	const contentType = response.headers.get("content-type") ?? "";
	const shouldParseJson =
		contentType.includes("application/json") ||
		raw.trim().startsWith("{") ||
		raw.trim().startsWith("[");

	let parsed: unknown = raw;
	if (shouldParseJson) {
		try {
			parsed = raw ? (JSON.parse(raw) as unknown) : null;
		} catch (error) {
			const snippet = raw.slice(0, 500);
			throw new Error(
				`${apiName} API error: ${response.status} (invalid JSON response)\n${snippet}`,
				{ cause: error },
			);
		}
	}

	if (!response.ok) {
		const detail =
			typeof parsed === "string"
				? parsed.slice(0, 500)
				: JSON.stringify(parsed);
		throw new Error(`${apiName} API error: ${response.status} ${detail}`);
	}
	if (!shouldParseJson) {
		const snippet = raw.slice(0, 500);
		throw new Error(
			`${apiName} API error: ${response.status} (non-JSON response)\n${snippet}`,
		);
	}

	return parsed as T;
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
