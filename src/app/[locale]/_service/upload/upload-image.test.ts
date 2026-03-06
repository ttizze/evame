import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadToR2 = vi.fn();

vi.mock("@/app/[locale]/_infrastructure/upload/r2-client", () => ({
	uploadToR2,
}));

describe("uploadImage", () => {
	beforeEach(() => {
		uploadToR2.mockReset();
	});

	it("jpeg画像は変換せずそのままR2へ渡す", async () => {
		const file = new File(["hello"], "photo.jpg", { type: "image/jpeg" });
		uploadToR2.mockResolvedValue("https://images.example.test/photo.jpg");

		const { uploadImage } = await import("./upload-image");
		const result = await uploadImage(file);

		expect(uploadToR2).toHaveBeenCalledWith(file);
		expect(result).toEqual({
			success: true,
			data: {
				imageUrl: "https://images.example.test/photo.jpg",
			},
		});
	});
});
