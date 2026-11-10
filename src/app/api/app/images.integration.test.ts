// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "@/app/[locale]/_service/upload/upload-image";
import { resetDatabase } from "@/tests/db-helpers";
import { createPersonalAccessToken, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { postAppImage } from "./images/handler";

vi.mock("@/app/[locale]/_service/upload/upload-image", () => ({
	uploadImage: vi.fn(),
}));

await setupDbPerFile(import.meta.url);

describe("アプリの画像アップロード", () => {
	let userId: string;
	let authorization: string;
	const imageId = "3f2b7c1e-8a4d-4e6f-9b0a-1c2d3e4f5a6b";

	const upload = (form: FormData) =>
		postAppImage(
			new Request("http://localhost/api/app/images", {
				method: "POST",
				headers: { Authorization: authorization },
				body: form,
			}),
		);
	const form = (id: string) => {
		const data = new FormData();
		data.set("id", id);
		data.set("image", new File(["image"], "photo.png", { type: "image/png" }));
		return data;
	};

	beforeEach(async () => {
		await resetDatabase();
		vi.mocked(uploadImage).mockReset();
		userId = (await createUser()).id;
		authorization = `Bearer ${(await createPersonalAccessToken({ userId })).plainKey}`;
	});

	it("端末の画像IDごとに保存先を決めて保存し、URLを返す", async () => {
		vi.mocked(uploadImage).mockResolvedValue({
			success: true,
			data: { imageUrl: "https://images.evame.tech/uploads/x" },
		});
		const response = await upload(form(imageId));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			url: "https://images.evame.tech/uploads/x",
		});
		expect(vi.mocked(uploadImage).mock.calls[0][1]).toBe(
			`app/${userId}/${imageId}`,
		);
	});

	it("画像IDを大文字で送っても小文字と同じ保存先にする", async () => {
		vi.mocked(uploadImage).mockResolvedValue({
			success: true,
			data: { imageUrl: "https://images.evame.tech/uploads/x" },
		});
		await upload(form(imageId.toUpperCase()));
		expect(vi.mocked(uploadImage).mock.calls[0][1]).toBe(
			`app/${userId}/${imageId}`,
		);
	});

	it("トークンがなければ保存しない", async () => {
		authorization = "";
		expect((await upload(form(imageId))).status).toBe(401);
		expect(uploadImage).not.toHaveBeenCalled();
	});

	it("画像IDがUUIDでなければ保存しない", async () => {
		expect((await upload(form("../other"))).status).toBe(422);
		expect(uploadImage).not.toHaveBeenCalled();
	});

	it("画像として保存できなければ理由を返す", async () => {
		vi.mocked(uploadImage).mockResolvedValue({
			success: false,
			message: "Image must be < 5 MB after processing",
		});
		const response = await upload(form(imageId));
		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			error: "Image must be < 5 MB after processing",
		});
	});
});
