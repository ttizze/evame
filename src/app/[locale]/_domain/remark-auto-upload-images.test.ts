import { remark } from "remark";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "../_service/upload/upload-image";
import { fileFromUrl } from "../_utils/file-from-url";
import { remarkAutoUploadImages } from "./remark-auto-upload-images";

// 外部ファイルシステム・アップロードサービスをモック（共有依存）
vi.mock("../_utils/file-from-url", () => {
	const pngBase64 =
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAAXNSR0IArs4c6QAAAARnQU1BAACx" +
		"jwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY2AAAAACAAHiIbwzAAAAAElFTkSuQmCC";
	const pngBuffer = Buffer.from(pngBase64, "base64");

	return {
		fileFromUrl: vi.fn(async () => ({
			name: "dummy.png",
			type: "image/png",
			arrayBuffer: async () => pngBuffer,
		})),
	};
});

vi.mock("../_service/upload/upload-image", () => ({
	uploadImage: vi.fn(async () => ({
		success: true,
		data: { imageUrl: "https://evame/uploads/uploaded.jpg" },
	})),
}));

describe("remarkAutoUploadImages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("自前ホストの画像", () => {
		it("既にアップロード済みの画像はスキップする", async () => {
			const md = `
![cf](https://images.evame.tech/uploads/already.jpg)
![legacy](https://images.eveeve.org/uploads/already.jpg)
![minio](http://localhost:9000/evame/uploads/already.jpg)
`;

			const vfile = await remark().use(remarkAutoUploadImages).process(md);

			expect(vfile.toString()).toContain(
				"https://images.evame.tech/uploads/already.jpg",
			);
			expect(vfile.toString()).toContain(
				"https://images.eveeve.org/uploads/already.jpg",
			);
			expect(vfile.toString()).toContain(
				"http://localhost:9000/evame/uploads/already.jpg",
			);
			expect(fileFromUrl).not.toHaveBeenCalled();
			expect(uploadImage).not.toHaveBeenCalled();
		});
	});

	describe("外部画像", () => {
		it("外部URLの画像をアップロードしてURLを書き換える", async () => {
			const md = "![ext](https://example.com/picture.png)";

			const vfile = await remark().use(remarkAutoUploadImages).process(md);

			expect(fileFromUrl).toHaveBeenCalledTimes(1);
			expect(uploadImage).toHaveBeenCalledTimes(1);
			expect(vfile.toString()).toContain("https://evame/uploads/uploaded.jpg");
			expect(vfile.toString()).not.toContain("https://example.com/picture.png");
		});
	});

	describe("混在コンテンツ", () => {
		it("ローカル画像はスキップし、外部画像のみアップロードする", async () => {
			const md = `
![local](https://images.evame.tech/uploads/local.jpg)
![remote1](https://foo.com/a.png)
![remote2](https://bar.com/b.png)
`;

			await remark().use(remarkAutoUploadImages).process(md);

			expect(fileFromUrl).toHaveBeenCalledTimes(2);
			expect(uploadImage).toHaveBeenCalledTimes(2);
		});
	});
});
