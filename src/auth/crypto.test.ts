import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./crypto";

describe("認証用暗号処理", () => {
	it("入力をSHA-256の16進文字列へ変換する", async () => {
		expect(await hashToken("hello")).toBe(
			"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		);
	});

	it("トークンを暗号学的乱数からURL安全な形式で生成する", () => {
		const token = generateToken();

		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(token).toHaveLength(43);
	});

	it("連続して生成したトークンを再利用しない", () => {
		expect(generateToken()).not.toBe(generateToken());
	});
});
