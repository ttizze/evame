import { describe, expect, it, vi } from "vitest";
import { getNotifications } from "./handler";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn().mockResolvedValue(null),
}));

describe("GET /api/notifications", () => {
	it("共有キャッシュにユーザー別通知を保存させない", async () => {
		const response = await getNotifications(
			new Request("http://localhost/api/notifications"),
		);

		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("vary")).toBe("Cookie, Authorization");
	});
});
