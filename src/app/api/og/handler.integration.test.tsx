// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getOgImage } from "./handler";

await setupDbPerFile(import.meta.url);

const { ogAssetStore, getItemRaw } = vi.hoisted(() => {
	const ogAssetStore = new Map<string, Uint8Array>();
	const getItemRaw = vi.fn(async (assetName: string) => {
		return ogAssetStore.get(assetName) ?? null;
	});
	return { ogAssetStore, getItemRaw };
});
const ogAssetFixtures = new Map<string, Uint8Array>();

vi.mock("nitro/storage", () => ({
	useStorage: () => ({ getItemRaw }),
}));

const assetPaths = {
	"inter-semi-bold.ttf": "../../../../public/inter-semi-bold.ttf",
	"BIZUDPGothic-Bold.ttf": "../../../../public/BIZUDPGothic-Bold.ttf",
	"logo.png": "../../../../public/logo.png",
};

beforeAll(async () => {
	for (const [assetName, assetPath] of Object.entries(assetPaths)) {
		const asset = new Uint8Array(
			await readFile(new URL(assetPath, import.meta.url)),
		);
		ogAssetFixtures.set(assetName, asset);
		ogAssetStore.set(assetName, asset);
	}
});

beforeEach(async () => {
	await resetDatabase();
	ogAssetStore.clear();
	for (const [assetName, asset] of ogAssetFixtures) {
		ogAssetStore.set(assetName, asset);
	}
	getItemRaw.mockClear();
});

function expectPng(response: Response): Promise<void> {
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/png");
	return response.arrayBuffer().then((body) => {
		const bytes = new Uint8Array(body);
		expect(bytes.slice(0, 8)).toEqual(
			new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
		);
		expect(bytes.byteLength).toBeGreaterThan(8);
	});
}

describe("GET /api/og", () => {
	it("存在しないページにはキャッシュ可能なPNG画像を返す", async () => {
		const response = await getOgImage(
			new Request("http://localhost/api/og?locale=en&slug=missing-page"),
		);

		await expectPng(response);
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, s-maxage=60, stale-while-revalidate=600",
		);
		expect(getItemRaw).not.toHaveBeenCalled();
	});

	it("通常ページにはserver assetから取得したフォントとロゴを使ったPNG画像を返す", async () => {
		const user = await createUser({
			name: "OG User",
			image:
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		});
		await createPageWithSegments({
			userId: user.id,
			slug: "og-page",
			segments: [
				{
					number: 0,
					text: "OG title",
					textAndOccurrenceHash: "og-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const response = await getOgImage(
			new Request("http://localhost/api/og?locale=en&slug=og-page"),
		);

		await expectPng(response);
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
		);
		expect(getItemRaw).toHaveBeenCalledTimes(3);
		expect(getItemRaw).toHaveBeenCalledWith("inter-semi-bold.ttf");
		expect(getItemRaw).toHaveBeenCalledWith("BIZUDPGothic-Bold.ttf");
		expect(getItemRaw).toHaveBeenCalledWith("logo.png");
	});

	it("server assetが欠落している場合は欠落した名前を含むエラーを返す", async () => {
		ogAssetStore.delete("logo.png");
		const user = await createUser({
			image:
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		});
		await createPageWithSegments({
			userId: user.id,
			slug: "asset-error-page",
			segments: [
				{
					number: 0,
					text: "Asset error",
					textAndOccurrenceHash: "asset-error-title",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		await expect(
			getOgImage(
				new Request("http://localhost/api/og?locale=en&slug=asset-error-page"),
			),
		).rejects.toThrow("Missing OG server asset: logo.png");
	});
});
