// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadToR2 } from "./r2-client";

const { put } = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: { UPLOADS: { put } } }));
afterEach(() => vi.unstubAllEnvs());

describe("R2への画像の保存", () => {
	const file = () => new File(["image"], "photo.jpg", { type: "image/jpeg" });

	it("保存先を指定すると、同じ画像を送り直しても同じ場所とURLになる", async () => {
		const first = await uploadToR2(file(), "app/user/1f0e6c2a");
		const second = await uploadToR2(file(), "app/user/1f0e6c2a");
		expect(first).toBe(second);
		expect(first).toMatch(/\/uploads\/app\/user\/1f0e6c2a$/);
		expect(put.mock.calls.map(([key]) => key)).toEqual([
			"uploads/app/user/1f0e6c2a",
			"uploads/app/user/1f0e6c2a",
		]);
	});

	it("Previewでは専用R2の画像を同じWorkerの画像APIから表示する", async () => {
		vi.stubEnv("DEV", false);
		vi.stubEnv("CF_IMAGE_HOST", "");
		expect(await uploadToR2(file(), "preview/photo")).toBe(
			"/api/uploads/uploads/preview/photo",
		);
	});

	it("本番では既存の画像配信ドメインを維持する", async () => {
		vi.stubEnv("DEV", false);
		vi.stubEnv("CF_IMAGE_HOST", "images.evame.tech");
		expect(await uploadToR2(file(), "production/photo")).toBe(
			"https://images.evame.tech/uploads/production/photo",
		);
	});

	it("画像配信ホストが未設定の本番でも既存のドメインを維持する", async () => {
		vi.stubEnv("DEV", false);
		vi.stubEnv("CF_IMAGE_HOST", undefined);
		expect(await uploadToR2(file(), "production/photo")).toBe(
			"https://images.evame.tech/uploads/production/photo",
		);
	});

	it("保存先を指定しなければ、送るたびに別の場所へ保存する", async () => {
		expect(await uploadToR2(file(), null)).not.toBe(
			await uploadToR2(file(), null),
		);
	});
});
