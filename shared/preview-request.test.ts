import { expect, it } from "vitest";
import { restorePreviewRequest } from "./preview-request";

it.each([null, "wrong"])(
	"プレビューは秘密値%sで直接呼び出されても本文を実行しない",
	(secret) => {
		const request = new Request("https://app-preview.test/_serverFn/save", {
			method: "POST",
			body: "原稿",
			headers: secret ? { "x-evame-preview-reader": secret } : {},
		});
		expect(
			restorePreviewRequest(request, "https://preview.test", "preview-secret"),
		).toBeNull();
	},
);
it("プレビューのPOSTは公開URL・元のOrigin・Cookie・本文に復元し、内部秘密値を取り除く", async () => {
	const request = new Request(
		"https://app-preview.test/_serverFn/save?action=save",
		{
			method: "POST",
			body: "原稿",
			headers: {
				host: "app-preview.test",
				origin: "https://preview.test",
				cookie: "session=test",
				"x-evame-preview-reader": "preview-secret",
			},
		},
	);
	const restored = restorePreviewRequest(
		request,
		"https://preview.test",
		"preview-secret",
	);
	expect(restored?.url).toBe("https://preview.test/_serverFn/save?action=save");
	expect(restored?.method).toBe("POST");
	expect(restored?.headers.get("origin")).toBe("https://preview.test");
	expect(restored?.headers.get("cookie")).toBe("session=test");
	expect(restored?.headers.get("host")).toBeNull();
	expect(restored?.headers.get("x-evame-preview-reader")).toBeNull();
	expect(await restored?.text()).toBe("原稿");
});
it("本番のリクエストはそのまま維持する", () => {
	const request = new Request("https://evame.tech/ja");
	expect(restorePreviewRequest(request, null, null)).toBe(request);
});
