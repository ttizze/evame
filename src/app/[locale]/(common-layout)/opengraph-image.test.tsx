import { describe, expect, it } from "vitest";

const { contentType, default: Image, size } = await import("./opengraph-image");

describe("/[locale]/opengraph-image", () => {
	it("Workers で fs が使えなくても OG 画像を返す", async () => {
		const response = await Image();

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain(contentType);
		expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
		expect(size).toEqual({
			width: 1200,
			height: 630,
		});
	});
});
