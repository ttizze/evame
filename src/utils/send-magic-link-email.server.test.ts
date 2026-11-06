// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it("メール送信キーがなくても静的生成のために認証モジュールを読み込める", async () => {
	vi.stubEnv("AUTH_RESEND_KEY", "");
	vi.stubEnv("RESEND_API_KEY", "");
	await expect(
		import("./send-magic-link-email.server"),
	).resolves.toHaveProperty("sendMagicLinkEmail");
});
