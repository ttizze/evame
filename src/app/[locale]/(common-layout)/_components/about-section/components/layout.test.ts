import { describe, expect, it } from "vitest";
import { ABOUT_FEATURE_BASE_CLASS } from "./layout";

describe("ABOUT_FEATURE_BASE_CLASS", () => {
	it("特徴セクションで横方向のはみ出しをクリップする", () => {
		expect(ABOUT_FEATURE_BASE_CLASS.split(" ")).toContain("overflow-x-clip");
	});
});
