import { describe, expect, it } from "vitest";
import { derivePrimaryAndCommentary } from "./derive-primary-and-commentary";

describe("derivePrimaryAndCommentary", () => {
	it("PRIMARY と COMMENTARY マッピングを返す", () => {
		const primaryType = { id: 101, key: "PRIMARY", label: "Mūla" };
		const segmentTypes = [
			primaryType,
			{ id: 201, key: "COMMENTARY", label: "Atthakatha" },
			{ id: 202, key: "COMMENTARY", label: "Tika" },
			{ id: 999, key: "OTHER", label: "Ignored" },
		];

		const result = derivePrimaryAndCommentary(segmentTypes);

		expect(result.primarySegmentType).toEqual(primaryType);
		expect(Array.from(result.commentarySegmentTypeIdByLabel.entries())).toEqual(
			[
				["Atthakatha", 201],
				["Tika", 202],
			],
		);
	});

	it('PRIMARY が無いときは "Segment type "PRIMARY" not found" を投げる', () => {
		const segmentTypes = [
			{ id: 301, key: "COMMENTARY", label: "Atthakatha" },
			{ id: 302, key: "COMMENTARY", label: "Tika" },
		];

		expect(() => derivePrimaryAndCommentary(segmentTypes)).toThrow(
			/Segment type "PRIMARY" not found/,
		);
	});
});
