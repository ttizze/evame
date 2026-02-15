import { describe, expect, it } from "vitest";
import { requestPush } from "./sync-api";

describe("evame-cli sync-api", () => {
	it("非JSONレスポンスでもUnexpected tokenにならず、本文付きでエラーになる", async () => {
		const fetchImpl: typeof fetch = async () => {
			return new Response("<html>502 Bad Gateway</html>", {
				status: 502,
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		};

		await expect(
			requestPush("http://example.com", "token", { inputs: [] }, fetchImpl),
		).rejects.toThrow("push API error: 502");
	});

	it("成功時はJSONをパースして返す", async () => {
		const fetchImpl: typeof fetch = async () => {
			return new Response(
				JSON.stringify({ status: "no_change", results: [] }),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		};

		await expect(
			requestPush("http://example.com", "token", { inputs: [] }, fetchImpl),
		).resolves.toEqual({ status: "no_change", results: [] });
	});
});
