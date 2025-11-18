import { describe, expect, it } from "vitest";

import { markdownToMdastWithSegments } from "@/app/[locale]/_lib/markdown-to-mdast-with-segments";

describe("markdownToMdastWithSegments – custom blocks", () => {
	it("segments hangnum + dd blocks without leaking dl markers", async () => {
		const markdown = [
			"::dl::",
			"::hangnum\n1.\n::",
			"::dd::\nFirst explanation line.\n::/dd::",
			"::hangnum\n2.\n::",
			"::dd::\nSecond explanation line.\n::/dd::",
			"::/dl::",
		].join("\n\n");

		const { segments } = await markdownToMdastWithSegments({
			header: "Sample Title",
			markdown,
		});

		expect(segments.map((segment) => segment.text)).toEqual([
			"Sample Title",
			"1.",
			"First explanation line.",
			"2.",
			"Second explanation line.",
		]);
		expect(segments.map((segment) => segment.number)).toEqual([0, 1, 2, 3, 4]);
	});

	it("segments other custom block types (gatha, indent, centre)", async () => {
		const markdown = [
			"::gatha1\nGatha line one\n::",
			"::gathalast\nGatha line last\n::",
			"::indent\nIndented sentence\n::",
			"::centre\nCentered sentence\n::",
		].join("\n\n");

		const { segments } = await markdownToMdastWithSegments({
			header: "Poem Title",
			markdown,
		});

		expect(segments.map((segment) => segment.text)).toEqual([
			"Poem Title",
			"Gatha line one",
			"Gatha line last",
			"Indented sentence",
			"Centered sentence",
		]);
		expect(segments.map((segment) => segment.number)).toEqual([0, 1, 2, 3, 4]);
	});
});
