import { describe, expect, it } from "vitest";
import { syncPushSchema } from "./schema";

describe("syncPushSchema", () => {
	it("slugは英数字/ハイフンを受け付ける", () => {
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
					slug: "slug-with-hyphen-123",
					expected_revision: null,
					title: "t",
					body: "b",
					published_at: null,
				},
			],
		});
		expect(parsed.success).toBe(true);
	});

	it("slugにアンダースコアがある場合は弾く", () => {
		const parsed = syncPushSchema.safeParse({
			inputs: [
				{
					slug: "bad_slug",
					expected_revision: null,
					title: "t",
					body: "b",
					published_at: null,
				},
			],
		});
		expect(parsed.success).toBe(false);
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
