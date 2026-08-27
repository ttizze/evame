import { describe, expect, test } from "vitest";
import { InvalidInputError } from "./errors";
import { buildScriptureHierarchy } from "./scripture";

describe("buildScriptureHierarchy", () => {
	test("親から現在の経典までをルート順で返す", () => {
		expect(
			buildScriptureHierarchy({ id: 3, title: "Verse", parent_id: 2 }, [
				{ id: 1, title: "Canon", parent_id: null },
				{ id: 2, title: "Chapter", parent_id: 1 },
				{ id: 3, title: "Verse", parent_id: 2 },
			]),
		).toEqual(["Canon", "Chapter", "Verse"]);
	});

	test("循環した階層は安全に拒否する", () => {
		expect(() =>
			buildScriptureHierarchy({ id: 1, title: "A", parent_id: 2 }, [
				{ id: 1, title: "A", parent_id: 2 },
				{ id: 2, title: "B", parent_id: 1 },
			]),
		).toThrow(InvalidInputError);
	});
});
