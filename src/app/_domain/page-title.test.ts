import { describe, expect, it } from "vitest";
import { pageTitleSchema } from "./page-title";

describe("記事の題名", () => {
	it("改行は空白にして前後の空白を除く", () => {
		expect(pageTitleSchema.parse("  一行目\r\n二行目\r三行目\n四行目  ")).toBe(
			"一行目 二行目 三行目 四行目",
		);
	});

	it("空白だけの題名は受け付けない", () => {
		expect(pageTitleSchema.safeParse(" \n ").success).toBe(false);
	});

	it("100文字までは受け付け、101文字は受け付けない", () => {
		expect(pageTitleSchema.safeParse("あ".repeat(100)).success).toBe(true);
		expect(pageTitleSchema.safeParse("あ".repeat(101)).success).toBe(false);
	});
});
