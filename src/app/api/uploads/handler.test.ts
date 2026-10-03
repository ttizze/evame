// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getUpload } from "./handler";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: { UPLOADS: { get } } }));
afterEach(() => vi.unstubAllEnvs());

describe("開発環境のR2画像を表示する", () => {
	it("ローカルのR2に保存した画像を同じホストから表示できる", async () => {
		vi.stubEnv("DEV", true);
		get.mockResolvedValue({
			arrayBuffer: async () => new Uint8Array([255, 216, 255, 217]).buffer,
			httpMetadata: { contentType: "image/jpeg" },
		});
		const response = await getUpload("uploads/image");
		expect(get).toHaveBeenCalledWith("uploads/image");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/jpeg");
		expect(response.headers.get("content-security-policy")).toBe(
			"default-src 'none'; sandbox",
		);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([255, 216, 255, 217]),
		);
	});
	it("画像がない場合は404を返す", async () => {
		vi.stubEnv("DEV", true);
		get.mockResolvedValue(null);
		expect((await getUpload("uploads/missing")).status).toBe(404);
	});
	it("本番では開発用の画像APIを公開しない", async () => {
		vi.stubEnv("DEV", false);
		expect((await getUpload("uploads/image")).status).toBe(404);
		expect(get).not.toHaveBeenCalled();
	});
});
