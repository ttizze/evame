const LEGACY_IV_LENGTH_BYTES = 16;

function decodeHex(value: string): Uint8Array<ArrayBuffer> {
	if (
		value.length === 0 ||
		value.length % 2 !== 0 ||
		!/^[0-9a-f]+$/iu.test(value)
	) {
		throw new Error("hex形式が不正です");
	}
	const bytes = new Uint8Array(new ArrayBuffer(value.length / 2));
	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

/** 旧EvameのSHA-256派生鍵 + AES-256-CBC形式をWorkerでも復号する。 */
export async function decryptLegacyGeminiApiKey(
	encryptedValue: string,
	encryptionKey: string,
): Promise<string> {
	try {
		if (
			typeof encryptedValue !== "string" ||
			typeof encryptionKey !== "string" ||
			encryptionKey.length === 0
		) {
			throw new Error("暗号化値または暗号化キーが不正です");
		}
		const parts = encryptedValue.split(":");
		if (parts.length !== 2 || !parts[0] || !parts[1]) {
			throw new Error("暗号化値の区切りが不正です");
		}
		const iv = decodeHex(parts[0]);
		const encrypted = decodeHex(parts[1]);
		if (
			iv.length !== LEGACY_IV_LENGTH_BYTES ||
			encrypted.length === 0 ||
			encrypted.length % LEGACY_IV_LENGTH_BYTES !== 0
		) {
			throw new Error("暗号化値の長さが不正です");
		}

		const digest = await globalThis.crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(encryptionKey),
		);
		const key = await globalThis.crypto.subtle.importKey(
			"raw",
			digest,
			{ name: "AES-CBC" },
			false,
			["decrypt"],
		);
		const plaintext = await globalThis.crypto.subtle.decrypt(
			{ name: "AES-CBC", iv },
			key,
			encrypted,
		);
		return new TextDecoder().decode(plaintext).trim().replace(/\s+/gu, " ");
	} catch {
		throw new Error("Gemini API keyの復号に失敗しました");
	}
}
