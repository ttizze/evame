import { describe, expect, it } from "vitest";
import { GET } from "./+server";

describe("sentry-example-api", () => {
	it("通常アクセスでは200とガイドメッセージを返す", async () => {
		const response = await GET({
			url: new URL("https://example.com/api/sentry-example-api"),
		} as never);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			status: "ok",
			message: "Append ?fail=1 to trigger Sentry test error",
		});
	});

	it("fail=1のときはSentry検証用に例外を投げる", async () => {
		await expect(
			GET({
				url: new URL("https://example.com/api/sentry-example-api?fail=1"),
			} as never),
		).rejects.toThrow("Sentry Example API Route Error");
	});
});
