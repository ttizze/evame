import { describe, expect, test } from "vitest";
import { decrypt, encrypt } from "./encryption.server";

describe("Encryption Utils", () => {
	test("should encrypt and decrypt text correctly", () => {
		const originalText = "Test message";

		const encrypted = encrypt(originalText);
		expect(encrypted).toBeDefined();
		expect(encrypted).toContain(":");
		expect(encrypted.split(":").length).toBe(2);

		const decrypted = decrypt(encrypted);
		expect(decrypted).toBe(originalText);
	});

	test("should handle empty string encryption and decryption", () => {
		const emptyText = "";

		const encrypted = encrypt(emptyText);
		const decrypted = decrypt(encrypted);

		expect(decrypted).toBe(emptyText);
	});

	test("should generate different ciphertexts for different plaintext", () => {
		const text1 = "test1";
		const text2 = "test2";

		const encrypted1 = encrypt(text1);
		const encrypted2 = encrypt(text2);

		expect(encrypted1).not.toBe(encrypted2);
	});

	test("should generate different ciphertexts for same plaintext due to random IV", () => {
		const text = "test message";

		const encrypted1 = encrypt(text);
		const encrypted2 = encrypt(text);

		expect(encrypted1).not.toBe(encrypted2);
	});


	test("should properly handle API key-like strings", () => {
		const apiKey = "testtest-testtest-testtest-testtest";

		const encrypted = encrypt(apiKey);
		const decrypted = decrypt(encrypted);

		expect(decrypted).toBe(apiKey);
		expect(decrypted.length).toBe(apiKey.length);
		expect(decrypted).not.toContain("\n");
		expect(decrypted).not.toContain("\r");
		expect(decrypted).not.toMatch(/\s/);
	});

	test("should handle API keys with potential whitespace issues", () => {
		const apiKeys = [
			" AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY ", // spaces at ends
			"AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY\n", // newline
			"\tAIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY\t", // tabs
			"AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY\r\n", // CRLF
		];

		for (const key of apiKeys) {
			const encrypted = encrypt(key);
			const decrypted = decrypt(encrypted);
			const cleanKey = "AIzaSyD9tSrke72PouQMnMX-a7eZSW0jkFMBWY";

			expect(decrypted).toBe(cleanKey);
			expect(decrypted.length).toBe(cleanKey.length);
			expect(decrypted).not.toContain("\n");
			expect(decrypted).not.toContain("\r");
			expect(decrypted).not.toContain("\t");
			expect(decrypted.trim()).toBe(decrypted);
		}
	});

	test("should handle non-encrypted API keys gracefully", () => {
		const plainApiKeys = [
			"testtesttest", // Plain API key
			"testtesttest ", // With space
			" testtest test", // With space
			"invalid-format-key", // Invalid format
			"key:without-encryption", // Contains : but not encrypted
		];

		for (const key of plainApiKeys) {
			const decrypted = decrypt(key);
			expect(decrypted).toBe(key.trim());
			expect(decrypted).not.toContain("\n");
			expect(decrypted).not.toContain("\r");
			expect(decrypted).not.toContain("\t");
			expect(decrypted.trim()).toBe(decrypted);
		}
	});
});
