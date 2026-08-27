const textEncoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return globalThis
		.btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/u, "");
}

/** リンクやCookieにそのまま入れられる、URL安全なランダム値を作る。 */
export function generateToken(byteLength = 32): string {
	if (!Number.isInteger(byteLength) || byteLength < 16) {
		throw new RangeError("トークンの長さが短すぎます");
	}

	const bytes = new Uint8Array(byteLength);
	globalThis.crypto.getRandomValues(bytes);
	return encodeBase64Url(bytes);
}

/** 値そのものを保存せず、SHA-256のダイジェストだけを返す。 */
export async function hashToken(value: string): Promise<string> {
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		textEncoder.encode(value),
	);

	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
