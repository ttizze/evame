import type { ReaderActions } from "../api/reader-actions/handler";

export async function callReaderAction<K extends keyof ReaderActions>(
	action: K,
	data: Parameters<ReaderActions[K]>[0],
): Promise<Awaited<ReturnType<ReaderActions[K]>>> {
	const response = await fetch(`/api/reader-actions?action=${action}`, {
		method: "POST",
		credentials: "same-origin",
		headers:
			data instanceof FormData
				? undefined
				: { "Content-Type": "application/json" },
		body: data instanceof FormData ? data : JSON.stringify(data),
	});
	if (response.status === 401) {
		window.location.assign(
			`/${document.documentElement.lang || "en"}/auth/login`,
		);
		throw new Error("Unauthorized");
	}
	if (!response.ok && response.status !== 400)
		throw new Error(`HTTP ${response.status}`);
	return response.json();
}
