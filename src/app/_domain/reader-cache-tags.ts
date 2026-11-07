/** 読み取りと無効化で同一のキーを使い、Unicode・大小文字・区切り文字によるタグの衝突を防ぐ。 */
export async function readerCacheTags(keys: readonly string[]) {
	return Promise.all(
		[...new Set(keys)].map(async (key) => {
			const digest = await crypto.subtle.digest(
				"SHA-256",
				new TextEncoder().encode(key),
			);
			return `reader:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
		}),
	);
}
