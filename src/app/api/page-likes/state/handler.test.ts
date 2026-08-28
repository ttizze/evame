import { describe, expect, it } from "vitest";
import { getPageLikeStates } from "./handler";

describe("GET /api/page-likes/state", () => {
	it("共有キャッシュにユーザー別状態を保存させない", async () => {
		const response = await getPageLikeStates(
			new Request("http://localhost/api/page-likes/state"),
		);

		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("vary")).toBe("Cookie, Authorization");
	});
});
