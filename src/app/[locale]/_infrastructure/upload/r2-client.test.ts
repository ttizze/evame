// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { uploadToR2 } from "./r2-client";

const { put } = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: { UPLOADS: { put } } }));

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

	it("保存先を指定しなければ、送るたびに別の場所へ保存する", async () => {
		expect(await uploadToR2(file(), null)).not.toBe(
			await uploadToR2(file(), null),
		);
	});
});
