import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { extractTranslations } from "./extract-translations.server";

describe("extractTranslations", () => {
	let warnSpy: MockInstance<typeof console.warn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("parses a valid JSON array of translations", () => {
		const input = JSON.stringify([
			{ number: 1, text: "Hello" },
			{ number: 2, text: "World" },
		]);
		const result = extractTranslations(input);
		expect(result).toEqual([
			{ number: 1, text: "Hello" },
			{ number: 2, text: "World" },
		]);
	});

	it("falls back to regex when input is not valid JSON", () => {
		const input = `Noise before and after
{"number": 10, "text": "A"}
some junk {"x": 1}
{"number": 11, "text": "B"} trailing`;
		const result = extractTranslations(input);
		expect(result).toEqual([
			{ number: 10, text: "A" },
			{ number: 11, text: "B" },
		]);
	});

	it("falls back when JSON is an object (not array)", () => {
		const input = JSON.stringify({ number: 7, text: "Single" });
		const result = extractTranslations(input);
		expect(result).toEqual([{ number: 7, text: "Single" }]);
	});

	it("decodes escape sequences (\\n, escaped quotes, \\uXXXX)", () => {
		const input = `
{"number": 1, "text": "line1\\nline2"}
{"number": 2, "text": "He said: \\"Hi\\""}
{"number": 3, "text": "\\u3053\\u3093\\u306b\\u3061\\u306f"}
`;
		const result = extractTranslations(input);
		expect(result).toEqual([
			{ number: 1, text: "line1\nline2" },
			{ number: 2, text: 'He said: "Hi"' },
			{ number: 3, text: "こんにちは" },
		]);
	});

	it("returns empty array when no matches are found", () => {
		const input = "no translation objects here";
		const result = extractTranslations(input);
		expect(result).toEqual([]);
	});
});
