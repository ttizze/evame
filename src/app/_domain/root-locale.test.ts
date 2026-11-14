import { expect, it } from "vitest";
import { resolveRootLocale } from "./root-locale";

it.each([
	["ja", "en", "ja"],
	["es", "ja", "es"],
	[undefined, "ja,en;q=0.8", "ja"],
	[undefined, "en;q=0.1,es;q=0.9", "es"],
	[undefined, "*", "en"],
	[undefined, null, "en"],
	["invalid", "ja", "ja"],
	[undefined, "not_a_language", "en"],
	[undefined, "ja;q=0,en;q=1", "en"],
	[undefined, "zh-TW", "zh"],
	["", "ja", "ja"],
])("保存言語%sとブラウザー言語%sから%sを選ぶ", (cookie, header, expected) => {
	expect(resolveRootLocale(cookie, header)).toBe(expected);
});
