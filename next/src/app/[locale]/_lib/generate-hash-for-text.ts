import crypto from "node:crypto";
// import { canonicalize } from "./text-utils";

/** SHA‑256 → Base32 (52 文字) */
function sha256Base32(input: string): string {
	const bytes = crypto.createHash("sha256").update(input).digest();
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	let out = "";
	let bits = 0;
	let value = 0;
	for (const b of bytes) {
		value = (value << 8) | b;
		bits += 8;
		while (bits >= 5) {
			out += alphabet[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
	return out;
}

// /** 決定論的ハッシュ（文 + 出現 N 回目）*/
// export function generateTextOccurrenceHash(
// 	rawText: string,
// 	occurrence: number,
// ): string {
// 	const canon = canonicalize(rawText);
// 	return sha256Base32(`${canon}\u0000${occurrence}`); // 区切りは NULL
// }

export function generateHashForText(text: string, occurrence: number): string {
	return crypto
		.createHash("sha256")
		.update(`${text}|${occurrence}`)
		.digest("hex");
}
