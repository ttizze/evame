import { describe, expect, it } from "vitest";
import { decryptLegacyGeminiApiKey } from "./credentials";

describe("旧Evame互換のGemini API key復号", () => {
	it("ENCRYPTION_KEYからAES-256-CBC暗号化キーを復号する", async () => {
		await expect(
			decryptLegacyGeminiApiKey(
				"00000000000000000000000000000000:e459fe1422e9e513a6c2f500845bff64",
				"test-encryption-key",
			),
		).resolves.toBe("AIza test");
	});

	it("不正な保存値や暗号化キーを秘密値なしで拒否する", async () => {
		await expect(
			decryptLegacyGeminiApiKey("plain-api-key", "test-encryption-key"),
		).rejects.toThrow("Gemini API keyの復号に失敗しました");
		await expect(
			decryptLegacyGeminiApiKey(
				"00000000000000000000000000000000:e459fe1422e9e513a6c2f500845bff64",
				"wrong-key",
			),
		).rejects.toThrow("Gemini API keyの復号に失敗しました");
	});
});
