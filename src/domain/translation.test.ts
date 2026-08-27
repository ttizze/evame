import { describe, expect, test } from "vitest";
import { InvalidInputError } from "./errors";
import {
	parseLocale,
	parsePositiveId,
	parseTranslationInput,
	rankTranslations,
} from "./vote";

describe("翻訳ドメインの入力と順位", () => {
	test("翻訳入力を正規化する", () => {
		expect(
			parseTranslationInput({
				segmentId: 3,
				locale: "JA_jp",
				text: "  訳文  ",
			}),
		).toEqual({ segmentId: 3, locale: "ja-jp", text: "  訳文  " });
	});

	test("空文字、不正ID、不正localeを拒否する", () => {
		expect(() =>
			parseTranslationInput({ segmentId: 0, locale: "ja", text: "x" }),
		).toThrow(InvalidInputError);
		expect(() =>
			parseTranslationInput({ segmentId: 1, locale: "", text: "x" }),
		).toThrow(InvalidInputError);
		expect(() =>
			parseTranslationInput({ segmentId: 1, locale: "ja", text: " " }),
		).toThrow(InvalidInputError);
	});

	test("50,000文字を超える翻訳本文を拒否する", () => {
		const accepted = "a".repeat(50_000);
		const rejected = "a".repeat(50_001);

		expect(
			parseTranslationInput({ segmentId: 1, locale: "ja", text: accepted })
				.text,
		).toHaveLength(50_000);
		expect(() =>
			parseTranslationInput({ segmentId: 1, locale: "ja", text: rejected }),
		).toThrow(InvalidInputError);
	});

	test("localeは小文字のハイフン区切りに正規化する", () => {
		expect(parseLocale("EN_us")).toBe("en-us");
	});

	test("同じpointと日時の候補は入力順を保つ", () => {
		const candidates = [
			{ id: 2, point: 1, createdAt: "2026-01-01T00:00:00.000Z" },
			{ id: 3, point: 2, createdAt: "2026-01-01T00:00:00.000Z" },
			{ id: 1, point: 2, createdAt: "2026-01-01T00:00:00.000Z" },
			{ id: 4, point: 1, createdAt: "2026-01-02T00:00:00.000Z" },
		];
		expect(rankTranslations(candidates).map(({ id }) => id)).toEqual([
			3, 1, 4, 2,
		]);
	});

	test("経典所有者の賛成票がpointより先に候補を押し上げる", () => {
		const candidates = [
			{
				id: 1,
				point: 100,
				createdAt: "2026-01-02T00:00:00.000Z",
				ownerUpvoted: false,
			},
			{
				id: 2,
				point: 1,
				createdAt: "2026-01-01T00:00:00.000Z",
				ownerUpvoted: true,
			},
		];
		expect(rankTranslations(candidates).map(({ id }) => id)).toEqual([2, 1]);
	});

	test("正の安全な整数以外のIDを拒否する", () => {
		expect(() => parsePositiveId(Number.MAX_SAFE_INTEGER + 1, "id")).toThrow(
			InvalidInputError,
		);
	});
});
