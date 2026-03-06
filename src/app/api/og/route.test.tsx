import { describe, expect, it } from "vitest";

const { GET } = await import("./route");

describe("/api/og", () => {
	it("locale ごとの generic OGP 画像へ redirect する", async () => {
		const response = await GET(
			new Request("http://localhost/api/og?locale=ja&slug=cloudflare"),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get("Location")).toBe(
			"http://localhost/ja/opengraph-image-8p799s",
		);
	});

	it("locale がなければ en の generic OGP 画像へ redirect する", async () => {
		const response = await GET(
			new Request("http://localhost/api/og?slug=missing"),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get("Location")).toBe(
			"http://localhost/en/opengraph-image-8p799s",
		);
	});
});
