import assert from "node:assert/strict";

export const previewSignalHeader = "x-evame-preview-signal";
export const previewSignalPath = "/evame-preview-signal.txt";

export function assertPreviewSignal(expected, actual) {
	assert.equal(actual, expected, "Cloudflare Preview deployment changed");
}

export async function readPreviewSignal(origin, expected) {
	try {
		const response = await fetch(
			`${origin}${previewSignalPath}?signal=${expected}`,
			{
				cache: "no-store",
				signal: AbortSignal.timeout(15000),
			},
		);
		if (response.ok) return (await response.text()).trim();
		await response.body?.cancel();
	} catch {
		// 次の試行でヘッダーと本文を取り直す。
	}
	return null;
}
