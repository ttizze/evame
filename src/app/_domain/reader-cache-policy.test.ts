import { expect, it } from "vitest";
import { shouldInvalidateReader } from "./reader-cache-policy";

it.each(["GET", "HEAD"])("%sの閲覧でキャッシュを消さない", (method) =>
	expect(
		shouldInvalidateReader(method, "/_serverFn/example", null, 200, null),
	).toBe(false),
);
it.each([400, 401, 403, 404, 405])(
	"拒否された%sの更新でキャッシュを消さない",
	(status) =>
		expect(
			shouldInvalidateReader("POST", "/_serverFn/example", null, status, null),
		).toBe(false),
);
it.each([
	"/_serverFn/example",
	"/api/segment-translations",
	"/api/sync/push",
	"/api/auth/update-user",
	"/api/auth/delete-user",
])("%sの更新は公開HTMLを更新する", (path) =>
	expect(shouldInvalidateReader("POST", path, null, 200, null)).toBe(true),
);
it("翻訳はチャンクごとに消さずジョブの完了時に公開HTMLを更新する", () => {
	expect(
		shouldInvalidateReader("POST", "/api/translate/chunk", null, 200, null),
	).toBe(false);
	expect(
		shouldInvalidateReader("POST", "/api/translate/chunk", null, 200, "true"),
	).toBe(true);
});
it.each([
	"/api/app/documents/abc123def456",
	"/api/app/documents/abc123def456/status",
])("アプリからの%sの更新は公開HTMLを更新する", (path) =>
	expect(shouldInvalidateReader("PUT", path, null, 200, null)).toBe(true),
);
it.each([
	"/api/auth/sign-out",
	"/api/notifications",
	"/api/page-views/1/increment",
	"/api/app/images",
	"/api/app/token",
])("%sの操作は本文のキャッシュを消さない", (path) =>
	expect(shouldInvalidateReader("POST", path, null, 200, null)).toBe(false),
);
it.each(["comment", "deleteComment", "follow"])(
	"%sの結果を公開HTMLへ反映する",
	(action) =>
		expect(
			shouldInvalidateReader("POST", "/api/reader-actions", action, 200, null),
		).toBe(true),
);

it("翻訳の投入だけでは消さず、本文が更新されるジョブ完了を待つ", () => {
	expect(
		shouldInvalidateReader(
			"POST",
			"/api/reader-actions",
			"translate",
			200,
			null,
		),
	).toBe(false);
});
