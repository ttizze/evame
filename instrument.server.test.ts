// @vitest-environment node
import * as Sentry from "@sentry/tanstackstart-react";
import { redirect } from "@tanstack/react-router";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/tanstackstart-react", () => ({
	init: vi.fn(),
	postgresIntegration: () => ({ name: "Postgres" }),
	extraErrorDataIntegration: () => ({ name: "ExtraErrorData" }),
}));

let beforeSend: NonNullable<
	NonNullable<Parameters<typeof Sentry.init>[0]>["beforeSend"]
>;

beforeAll(async () => {
	vi.stubEnv("NODE_ENV", "production");
	vi.stubEnv("SENTRY_DSN", "");
	await import("./instrument.server.mjs");
	expect(Sentry.init).toHaveBeenCalledOnce();
	const callback = vi.mocked(Sentry.init).mock.calls[0]?.[0]?.beforeSend;
	if (!callback) throw new Error("本番SentryのbeforeSendが設定されていない");
	beforeSend = callback;
});

afterAll(() => vi.unstubAllEnvs());

describe("本番Sentryのエラー送信", () => {
	it("ログイン後の正常なリダイレクトをエラーとして送信しない", async () => {
		const event = { type: undefined, message: "[object Response]" };
		const result = await beforeSend(event, {
			originalException: redirect({ href: "/ja" }),
		});
		expect(result).toBeNull();
	});

	it("実際の実行時エラーは送信する", async () => {
		const event = { type: undefined, message: "依存が見つからない" };
		const result = await beforeSend(event, {
			originalException: new Error(event.message),
		});
		expect(result).toBe(event);
	});

	it("リダイレクトではない500レスポンスは送信する", async () => {
		const event = { type: undefined, message: "[object Response]" };
		const result = await beforeSend(event, {
			originalException: new Response(null, { status: 500 }),
		});
		expect(result).toBe(event);
	});
});
