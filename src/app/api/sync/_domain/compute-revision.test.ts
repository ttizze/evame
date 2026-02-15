import { describe, expect, it } from "vitest";
import { computeRevision } from "./compute-revision";

describe("computeRevision", () => {
	const base = {
		slug: "my-post",
		title: "Hello World",
		body: "This is the body.",
		publishedAt: new Date("2024-01-01T00:00:00.000Z"),
	};

	it("title + body + published_at → 決定的ハッシュを返す", () => {
		const rev = computeRevision(base);
		expect(rev).toMatch(/^[0-9a-f]{64}$/);
	});

	it("同じ入力 → 同じ結果（決定性）", () => {
		const rev1 = computeRevision(base);
		const rev2 = computeRevision(base);
		expect(rev1).toBe(rev2);
	});

	it("published_at = null → 空文字扱い", () => {
		const rev = computeRevision({ ...base, publishedAt: null });
		expect(rev).toMatch(/^[0-9a-f]{64}$/);
		expect(rev).not.toBe(computeRevision(base));
	});

	it("body が異なる → 異なるRevision", () => {
		const rev1 = computeRevision(base);
		const rev2 = computeRevision({ ...base, body: "Different body." });
		expect(rev1).not.toBe(rev2);
	});

	it("title が異なる → 異なるRevision", () => {
		const rev1 = computeRevision(base);
		const rev2 = computeRevision({ ...base, title: "Different Title" });
		expect(rev1).not.toBe(rev2);
	});

	it("slug が異なる → 異なるRevision", () => {
		const rev1 = computeRevision(base);
		const rev2 = computeRevision({ ...base, slug: "other-post" });
		expect(rev1).not.toBe(rev2);
	});
});
