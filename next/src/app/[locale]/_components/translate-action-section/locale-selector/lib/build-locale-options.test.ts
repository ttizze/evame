import { describe, expect, it } from "vitest";
import { buildLocaleOptions } from "./build-locale-options";

import type { LocaleOption } from "@/app/_constants/locale";

describe("buildLocaleOptions", () => {
	it("sourceLocale が supportedLocaleOptions に存在し、existLocales が空の場合、ソースロケールのみ返す", () => {
		const sourceLocale = "en";
		const existLocales: string[] = [];
		const supportedLocaleOptions: LocaleOption[] = [
			{ code: "en", name: "English" },
			{ code: "fr", name: "French" },
		];

		const result = buildLocaleOptions(
			sourceLocale,
			existLocales,
			supportedLocaleOptions,
		);

		expect(result).toEqual([{ code: "en", name: "English" }]);
	});

	it("existLocales に重複がある場合、重複なくマージされる", () => {
		const sourceLocale = "en";
		const existLocales: string[] = ["fr", "en", "fr"];
		const supportedLocaleOptions: LocaleOption[] = [
			{ code: "en", name: "English" },
			{ code: "fr", name: "French" },
		];

		const result = buildLocaleOptions(
			sourceLocale,
			existLocales,
			supportedLocaleOptions,
		);

		expect(result).toEqual([
			{ code: "en", name: "English" },
			{ code: "fr", name: "French" },
		]);
	});
});
