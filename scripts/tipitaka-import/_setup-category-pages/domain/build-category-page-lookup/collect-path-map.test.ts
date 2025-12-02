import { describe, expect, it } from "vitest";
import type { CategoryNode } from "../../../types";
import { collectPathMap } from "./collect-path-map";

describe("collectPathMap", () => {
	it("単一レベルのツリーを渡すと、各ノードのパスをマップに収集する", () => {
		// Arrange
		const root: CategoryNode = {
			dirSegment: "",
			title: "Root",
			order: 0,
			children: new Map([
				[
					"01-first",
					{
						dirSegment: "01-first",
						title: "First",
						order: 1,
						children: new Map(),
					},
				],
				[
					"02-second",
					{
						dirSegment: "02-second",
						title: "Second",
						order: 2,
						children: new Map(),
					},
				],
			]),
		};

		// Act
		const result = collectPathMap(root);

		// Assert
		expect(result.size).toBe(2);
		expect(result.get("01-first")?.dirSegment).toBe("01-first");
		expect(result.get("02-second")?.dirSegment).toBe("02-second");
	});

	it("多階層のツリーを渡すと、すべてのノードのパスをマップに収集する", () => {
		// Arrange
		const root: CategoryNode = {
			dirSegment: "",
			title: "Root",
			order: 0,
			children: new Map([
				[
					"01-sutta",
					{
						dirSegment: "01-sutta",
						title: "Sutta",
						order: 1,
						children: new Map([
							[
								"02-diggha",
								{
									dirSegment: "02-diggha",
									title: "Diggha",
									order: 2,
									children: new Map(),
								},
							],
							[
								"03-majjhima",
								{
									dirSegment: "03-majjhima",
									title: "Majjhima",
									order: 3,
									children: new Map(),
								},
							],
						]),
					},
				],
				[
					"04-vinaya",
					{
						dirSegment: "04-vinaya",
						title: "Vinaya",
						order: 4,
						children: new Map(),
					},
				],
			]),
		};

		// Act
		const result = collectPathMap(root);

		// Assert
		expect(result.size).toBe(4);
		expect(result.get("01-sutta")?.dirSegment).toBe("01-sutta");
		expect(result.get("01-sutta/02-diggha")?.dirSegment).toBe("02-diggha");
		expect(result.get("01-sutta/03-majjhima")?.dirSegment).toBe("03-majjhima");
		expect(result.get("04-vinaya")?.dirSegment).toBe("04-vinaya");
	});

	it("ルートノードのみのツリーを渡すと、空のマップを返す", () => {
		// Arrange
		const root: CategoryNode = {
			dirSegment: "",
			title: "Root",
			order: 0,
			children: new Map(),
		};

		// Act
		const result = collectPathMap(root);

		// Assert
		expect(result.size).toBe(0);
	});

	it("深い階層のツリーを渡すと、すべてのパスを正しく収集する", () => {
		// Arrange
		const root: CategoryNode = {
			dirSegment: "",
			title: "Root",
			order: 0,
			children: new Map([
				[
					"01-level1",
					{
						dirSegment: "01-level1",
						title: "Level 1",
						order: 1,
						children: new Map([
							[
								"02-level2",
								{
									dirSegment: "02-level2",
									title: "Level 2",
									order: 2,
									children: new Map([
										[
											"03-level3",
											{
												dirSegment: "03-level3",
												title: "Level 3",
												order: 3,
												children: new Map(),
											},
										],
									]),
								},
							],
						]),
					},
				],
			]),
		};

		// Act
		const result = collectPathMap(root);

		// Assert
		expect(result.size).toBe(3);
		expect(result.get("01-level1")?.dirSegment).toBe("01-level1");
		expect(result.get("01-level1/02-level2")?.dirSegment).toBe("02-level2");
		expect(result.get("01-level1/02-level2/03-level3")?.dirSegment).toBe(
			"03-level3",
		);
	});
});
