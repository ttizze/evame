import { describe, expect, it } from "vitest";
import { parseMaxAttempts, retryDelaySeconds } from "./translation-queue";

describe("翻訳Queueの再試行", () => {
	it("指数バックオフを使い、最大試行回数では再試行しない", () => {
		expect(retryDelaySeconds(1, 3)).toBe(1);
		expect(retryDelaySeconds(2, 3)).toBe(2);
		expect(retryDelaySeconds(3, 3)).toBeNull();
	});

	it("不正な試行回数は再試行しない", () => {
		expect(retryDelaySeconds(0, 3)).toBeNull();
		expect(retryDelaySeconds(Number.NaN, 3)).toBeNull();
	});

	it("不正な最大試行回数は既定値3へ戻す", () => {
		expect(parseMaxAttempts(undefined)).toBe(3);
		expect(parseMaxAttempts("abc")).toBe(3);
		expect(parseMaxAttempts("0")).toBe(3);
		expect(parseMaxAttempts("-1")).toBe(3);
		expect(parseMaxAttempts(" 5 ")).toBe(5);
	});
});
