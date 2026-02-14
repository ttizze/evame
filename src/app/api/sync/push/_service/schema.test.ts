import { describe, expect, it } from "vitest";
import { syncPushSchema } from "./schema";

describe("syncPushSchema", () => {
	it("slugは英数字/ハイフン/アンダースコアを受け付ける", () => {
		const parsed = syncPushSchema.safeParse({
			inputs: [
				{
					slug: "FRWB3kUc",
					expected_revision: null,
					title: "t",
					body: "b",
					published_at: null,
				},
				{
					slug: "slug_with_underscore-123",
					expected_revision: null,
					title: "t",
					body: "b",
					published_at: null,
				},
			],
		});
		expect(parsed.success).toBe(true);
	});

	it("slugにスラッシュがある場合は弾く", () => {
		const parsed = syncPushSchema.safeParse({
			inputs: [
				{
					slug: "bad/slug",
					expected_revision: null,
					title: "t",
					body: "b",
					published_at: null,
				},
			],
		});
		expect(parsed.success).toBe(false);
	});
});
