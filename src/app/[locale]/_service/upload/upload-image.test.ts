// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "./upload-image";

const { input, transform, output, upload } = vi.hoisted(() => ({
	input: vi.fn(),
	transform: vi.fn(),
	output: vi.fn(),
	upload: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: { IMAGES: { input } } }));
vi.mock("@/app/[locale]/_infrastructure/upload/r2-client", () => ({
	uploadToR2: upload,
}));
afterEach(() => vi.restoreAllMocks());

describe("Cloudflare Imagesで画像を圧縮してR2に保存する", () => {
	it("大きな画像を幅2560以下のJPEGへ変換して保存する", async () => {
		input.mockReturnValue({ transform });
		transform.mockReturnValue({ output });
		output.mockResolvedValue({
			response: () => new Response(new Uint8Array([255, 216, 255, 217])),
		});
		upload.mockResolvedValue("https://images.evame.tech/uploads/test");
		const result = await uploadImage(
			new File([new Uint8Array(6 * 1024 * 1024)], "photo.png", {
				type: "image/png",
			}),
		);
		expect(result).toMatchObject({
			success: true,
			data: { imageUrl: "https://images.evame.tech/uploads/test" },
		});
		expect(transform).toHaveBeenCalledWith({ width: 2560, fit: "scale-down" });
		expect(output).toHaveBeenCalledWith({ format: "image/jpeg", quality: 80 });
		const file = upload.mock.calls[0][0] as File;
		expect(file.name).toBe("photo.jpg");
		expect(file.type).toBe("image/jpeg");
		expect(file.size).toBe(4);
	});
	it("SVGは変換せず元のファイルを保存する", async () => {
		const file = new File(["<svg/>"], "image.svg", { type: "image/svg+xml" });
		await uploadImage(file);
		expect(input).not.toHaveBeenCalled();
		expect(upload).toHaveBeenCalledWith(file);
	});
	it("画像以外のファイルは保存しない", async () => {
		expect(
			await uploadImage(new File(["text"], "text.txt", { type: "text/plain" })),
		).toMatchObject({ success: false });
		expect(input).not.toHaveBeenCalled();
		expect(upload).not.toHaveBeenCalled();
	});
	it("変換後に5MBを超える画像は保存しない", async () => {
		input.mockReturnValue({ transform });
		transform.mockReturnValue({ output });
		output.mockResolvedValue({
			response: () => new Response(new Uint8Array(5 * 1024 * 1024 + 1)),
		});
		expect(
			await uploadImage(
				new File(["image"], "photo.png", { type: "image/png" }),
			),
		).toMatchObject({
			success: false,
			message: "Image must be < 5 MB after processing",
		});
		expect(upload).not.toHaveBeenCalled();
	});
});
