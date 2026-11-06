import { describe, expect, it } from "vitest";
import { readerPageQueryState } from "./pagination-url";

describe("閲覧ページのURLからページ番号を読み取る", () => {
	it.each(["0", "-1", "1.5", "2junk", "9007199254740992", "Infinity", ""])(
		"%sはサーバーと同じ先頭ページとして扱う",
		(value) => {
			expect(readerPageQueryState.parse(value)).toBe(1);
		},
	);
	it.each([
		["2", 2],
		["2.0", 2],
		["2e1", 20],
		["9007199254740991", Number.MAX_SAFE_INTEGER],
	] as const)("%sは正の安全な整数%sとして扱う", (value, expected) => {
		expect(readerPageQueryState.parse(value)).toBe(expected);
	});
});
