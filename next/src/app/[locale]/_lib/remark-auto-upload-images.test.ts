import { remark } from "remark";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fileFromUrl } from "./file-from-url";
import { remarkAutoUploadImages } from "./remark-auto-upload-images";
import { uploadImage } from "./upload";
vi.mock("@/app/[locale]/_lib/file-from-url", () => {
	// 1×1 px 透明 PNG (完全な base64)
	const pngBase64 =
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAAXNSR0IArs4c6QAAAARnQU1BAACx" +
		"jwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY2AAAAACAAHiIbwzAAAAAElFTkSuQmCC";

	const pngBuffer = Buffer.from(pngBase64, "base64"); // ← **Buffer**

	return {
		fileFromUrl: vi.fn(async () => ({
			name: "dummy.png",
			type: "image/png",
			arrayBuffer: async () => pngBuffer, // ← **そのまま Buffer を返す**
		})),
	};
});
vi.mock("@/app/[locale]/_lib/upload", () => {
	return {
		uploadImage: vi.fn(async () => ({
			success: true,
			data: { imageUrl: "https://evame/uploads/uploaded.jpg" },
		})),
	};
});

describe("remarkAutoUploadImages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("skips images that are already under evame/uploads", async () => {
		const md = "![alt](https://evame/uploads/already.jpg)";
		const vfile = await remark().use(remarkAutoUploadImages).process(md);

		expect(vfile.toString()).toContain("https://evame/uploads/already.jpg");
		expect(fileFromUrl).not.toHaveBeenCalled();
		expect(uploadImage).not.toHaveBeenCalled();
	});

	it("uploads external images and rewrites the URL", async () => {
		const md = "![ext](https://example.com/picture.png)";
		const vfile = await remark().use(remarkAutoUploadImages).process(md);

		expect(fileFromUrl).toHaveBeenCalledTimes(1);
		expect(uploadImage).toHaveBeenCalledTimes(1);
		expect(vfile.toString()).toContain("https://evame/uploads/uploaded.jpg");
		expect(vfile.toString()).not.toContain("https://example.com/picture.png");
	});

	it("processes mixed content correctly", async () => {
		const md = `
![local](https://evame/uploads/local.jpg)
![remote1](https://foo.com/a.png)
![remote2](https://bar.com/b.png)
`;
		await remark().use(remarkAutoUploadImages).process(md);

		// one local image should be ignored, two remote images processed
		expect(fileFromUrl).toHaveBeenCalledTimes(2);
		expect(uploadImage).toHaveBeenCalledTimes(2);
	});
});
