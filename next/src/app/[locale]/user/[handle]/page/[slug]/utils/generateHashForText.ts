import crypto from "node:crypto";

export function generateHashForText(text: string, occurrence: number): string {
	return crypto
		.createHash("sha256")
		.update(`${text}|${occurrence}`)
		.digest("hex");
}
