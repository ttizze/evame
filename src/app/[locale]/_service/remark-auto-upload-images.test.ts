import { remark } from "remark";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileFromUrl } from "../_utils/file-from-url";
import { remarkAutoUploadImages } from "./remark-auto-upload-images";
import { uploadImage } from "./upload/upload-image";

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

vi.mock("./upload/upload-image", () => ({
	uploadImage: vi.fn(async () => ({
		success: true,
		data: { imageUrl: "https://evame/uploads/uploaded.jpg" },
	})),
}));

describe("remarkAutoUploadImages", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("自前ホストの画像", () => {
		it("設定した画像ホストのアップロード済み画像を再アップロードしない", async () => {
			vi.stubEnv("CF_IMAGE_HOST", "images.example.test");
			const md = "![custom](https://images.example.test/uploads/already.jpg)";

			const vfile = await remark().use(remarkAutoUploadImages).process(md);

			expect(vfile.toString()).toContain(
				"https://images.example.test/uploads/already.jpg",
			);
			expect(fileFromUrl).not.toHaveBeenCalled();
			expect(uploadImage).not.toHaveBeenCalled();
		});
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

	it("同じ中身の外部画像は送り直しても同じ保存先にし、中身が違えば別の保存先にする", async () => {
		const md = "![ext](https://example.com/picture.png)";
		await remark().use(remarkAutoUploadImages).process(md);
		await remark().use(remarkAutoUploadImages).process(md);
		const [first, second] = vi
			.mocked(uploadImage)
			.mock.calls.map(([, path]) => path);
		expect(first).toMatch(/^external\/[0-9a-f]{64}$/);
		expect(second).toBe(first);

		vi.mocked(fileFromUrl).mockResolvedValueOnce(
			new File([new Uint8Array([1, 2, 3])], "other.png", { type: "image/png" }),
		);
		await remark().use(remarkAutoUploadImages).process(md);
		expect(vi.mocked(uploadImage).mock.calls[2][1]).not.toBe(first);
	});

	it("同じバイト列でもMIMEによって変換結果が変わる画像は別の保存先にする", async () => {
		const bytes = new Uint8Array([255, 216, 255, 217]);
		for (const type of ["image/jpeg", "image/svg+xml"]) {
			vi.mocked(fileFromUrl).mockResolvedValueOnce(
				new File([bytes], "photo", { type }),
			);
			await remark()
				.use(remarkAutoUploadImages)
				.process("![画像](https://example.com/photo)");
		}
		const paths = vi.mocked(uploadImage).mock.calls.map(([, path]) => path);
		expect(paths).toHaveLength(2);
		expect(paths[0]).not.toBe(paths[1]);
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
