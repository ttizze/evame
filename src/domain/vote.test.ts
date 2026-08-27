import { describe, expect, test } from "vitest";
import { InvalidInputError } from "./errors";
import { parseSupportedLocale, resolveVoteTransition } from "./vote";

describe("resolveVoteTransition", () => {
	test("未投票から賛成票を作成すると point が1増える", () => {
		expect(resolveVoteTransition(undefined, true)).toEqual({
			action: "create",
			pointDelta: 1,
			finalIsUpvote: true,
		});
	});

	test("未投票から反対票を作成すると point が1減る", () => {
		expect(resolveVoteTransition(null, false)).toEqual({
			action: "create",
			pointDelta: -1,
			finalIsUpvote: false,
		});
	});

	test("反対票を賛成票へ変更すると point が2増える", () => {
		expect(resolveVoteTransition(false, true)).toEqual({
			action: "update",
			pointDelta: 2,
			finalIsUpvote: true,
		});
	});

	test("賛成票を反対票へ変更すると point が2減る", () => {
		expect(resolveVoteTransition(true, false)).toEqual({
			action: "update",
			pointDelta: -2,
			finalIsUpvote: false,
		});
	});

	test("同じ賛成票を押すと票を削除して point が1減る", () => {
		expect(resolveVoteTransition(true, true)).toEqual({
			action: "delete",
			pointDelta: -1,
			finalIsUpvote: null,
		});
	});

	test("同じ反対票を押すと票を削除して point が1増える", () => {
		expect(resolveVoteTransition(false, false)).toEqual({
			action: "delete",
			pointDelta: 1,
			finalIsUpvote: null,
		});
	});

	test("非booleanの投票値は拒否する", () => {
		expect(() =>
			resolveVoteTransition(undefined, "true" as unknown as boolean),
		).toThrow(InvalidInputError);
	});
});

describe("parseSupportedLocale", () => {
	test("正本に含まれるlocaleを小文字へ正規化して受け入れる", () => {
		expect(parseSupportedLocale("JA")).toBe("ja");
	});

	test("正本にないlocaleを拒否する", () => {
		expect(() => parseSupportedLocale("eo")).toThrow(InvalidInputError);
	});
});
