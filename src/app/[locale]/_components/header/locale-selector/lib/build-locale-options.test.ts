import { describe, expect, it } from "vitest";
import type { LocaleOption } from "@/app/_constants/locale";
import { buildLocaleOptions } from "./build-locale-options";

describe("buildLocaleOptions", () => {
	it("sourceLocale が supportedLocaleOptions に存在し、existLocales が空の場合、ソースロケールのみ返す", () => {
		const sourceLocale = "en";
		const existLocales: string[] = [];
		const supportedLocaleOptions: LocaleOption[] = [
			{ code: "en", name: "English" },
			{ code: "fr", name: "French" },
		];

		const result = buildLocaleOptions({
			sourceLocale,
			existLocales,
			supported: supportedLocaleOptions,
		});

		expect(result).toEqual([
			{ code: "en", name: "English", status: "source" },
			{ code: "fr", name: "French", status: "untranslated" },
		]);
	});

	it("existLocales に重複がある場合、重複なくマージされる", () => {
		const sourceLocale = "en";
		const existLocales: string[] = ["fr", "en", "fr"];
		const supportedLocaleOptions: LocaleOption[] = [
			{ code: "en", name: "English" },
			{ code: "fr", name: "French" },
		];

		const result = buildLocaleOptions({
			sourceLocale,
			existLocales,
			supported: supportedLocaleOptions,
		});

		expect(result).toEqual([
			{ code: "en", name: "English", status: "source" },
			{ code: "fr", name: "French", status: "translated" },
		]);
	});
});
