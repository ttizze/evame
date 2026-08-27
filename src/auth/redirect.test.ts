import { describe, expect, it } from "vitest";
import { buildMagicLink, normalizeRedirectPath } from "./redirect";

describe("認証後のリダイレクト", () => {
	const origin = "https://evame.example";

	it("同一サイトの相対パスとクエリだけを許可する", () => {
		expect(normalizeRedirectPath("/scriptures?locale=ja", origin)).toBe(
			"/scriptures?locale=ja",
		);
	});

	it("外部URLを既定のトップページへ置き換える", () => {
		expect(
			normalizeRedirectPath("https://attacker.example/steal", origin),
		).toBe("/");
		expect(normalizeRedirectPath("//attacker.example/steal", origin)).toBe("/");
	});

	it("バックスラッシュを含む曖昧なURLを許可しない", () => {
		expect(normalizeRedirectPath("/\\\\attacker.example", origin)).toBe("/");
	});

	it("正規化後にプロトコル相対URLとなるパスを許可しない", () => {
		expect(normalizeRedirectPath("/..//attacker.example", origin)).toBe("/");
	});

	it("マジックリンクには安全化した遷移先だけを埋め込む", () => {
		const link = buildMagicLink({
			origin,
			verifyPath: "/api/auth/verify",
			token: "test-token",
			redirectTo: "https://attacker.example/steal",
		});
		const url = new URL(link);

		expect(url.origin).toBe(origin);
		expect(url.pathname).toBe("/api/auth/verify");
		expect(url.searchParams.get("token")).toBe("test-token");
		expect(url.searchParams.get("next")).toBe("/");
	});
});
