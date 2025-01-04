import crypto from "node:crypto";

const IV_LENGTH = 16;
function getEncryptionKey(): string {
	if (
		typeof process.env.ENCRYPTION_KEY === "undefined" ||
		process.env.ENCRYPTION_KEY === null
	) {
		throw new Error("ENCRYPTION_KEY is not set");
	}
	return process.env.ENCRYPTION_KEY;
}

function deriveKey(key: string): Buffer {
	return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(text: string): string {
	const key = deriveKey(getEncryptionKey());
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
	let encrypted = cipher.update(text.trim().replace(/\s+/g, " "));
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
	// If the text doesn't contain ':' or doesn't match encrypted format, assume it's already a plain API key
	if (!text.includes(":")) {
		console.log("Input appears to be a plain API key, returning as-is");
		return text.trim().replace(/\s+/g, " ");
	}

	try {
		const key = deriveKey(getEncryptionKey());
		const [ivHex, encryptedHex] = text.split(":");

		// Verify hex format
		if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]+$/i.test(encryptedHex)) {
			console.log("Input is not in valid encrypted format, returning as-is");
			return text.trim().replace(/\s+/g, " ");
		}

		const iv = Buffer.from(ivHex, "hex");
		const encryptedText = Buffer.from(encryptedHex, "hex");
		const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString("utf8").trim().replace(/\s+/g, " ");
	} catch (error) {
		console.log("Decryption failed, input might be a plain API key");
		return text.trim().replace(/\s+/g, " ");
	}
}
