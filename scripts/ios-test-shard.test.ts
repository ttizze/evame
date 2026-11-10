// @vitest-environment node
import { describe, expect, it } from "vitest";
import { selectIosTests } from "./ios-test-shard.mjs";

describe("iOSの画面操作テストの分割", () => {
	it("日本語を含む全テストを重複なく分け、追加したテストも必ず実行対象にする", () => {
		const tests = [
			"Editor/入力()",
			"Editor/Undo()",
			"Editor/写真()",
			"Editor/表()",
			"Editor/追加()",
		];
		const first = selectIosTests(tests, 0, 2);
		const second = selectIosTests(tests, 1, 2);
		expect([...first, ...second].sort()).toEqual([...tests].sort());
		expect(first.some((test) => second.includes(test))).toBe(false);
		expect(tests).toEqual([
			"Editor/入力()",
			"Editor/Undo()",
			"Editor/写真()",
			"Editor/表()",
			"Editor/追加()",
		]);
		expect(selectIosTests([...tests].reverse(), 0, 2)).toEqual(first);
	});
	it.each([
		[0, 0],
		[-1, 2],
		[2, 2],
		[0.5, 2],
		[0, 1.5],
		[0, 3],
	])("空になる分割や範囲外の指定 %s/%s を拒否する", (index, count) =>
		expect(() => selectIosTests(["a", "b"], index, count)).toThrow(),
	);
	it("空の列挙結果を成功扱いにしない", () => {
		expect(() => selectIosTests([], 0, 2)).toThrow();
	});
});
