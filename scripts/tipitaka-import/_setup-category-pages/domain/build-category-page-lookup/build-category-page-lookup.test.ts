import { describe, expect, it } from "vitest";
import type { CategoryNode } from "../../../types";
import { buildCategoryPageLookup } from "./build-category-page-lookup";

describe("buildCategoryPageLookup", () => {
	it("ルートページとpageIdが設定されたノードを渡すと、パスからページIDへのマップを作成する", () => {
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
						pageId: 100,
						children: new Map([
							[
								"02-diggha",
								{
									dirSegment: "02-diggha",
									title: "Diggha",
									order: 2,
									pageId: 200,
									children: new Map(),
								},
							],
						]),
					},
				],
			]),
		};
		const rootPage = { id: 1 } as { id: number };

		// Act
		const result = buildCategoryPageLookup(root, rootPage);

		// Assert
		expect(result.size).toBe(3);
		expect(result.get("")).toBe(1);
		expect(result.get("01-sutta")).toBe(100);
		expect(result.get("01-sutta/02-diggha")).toBe(200);
	});

	it("pageIdが設定されていないノードはマップに含まれない", () => {
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
						pageId: 100,
						children: new Map([
							[
								"02-diggha",
								{
									dirSegment: "02-diggha",
									title: "Diggha",
									order: 2,
									children: new Map(), // pageIdが未設定
								},
							],
						]),
					},
				],
			]),
		};
		const rootPage = { id: 1 } as { id: number };

		// Act
		const result = buildCategoryPageLookup(root, rootPage);

		// Assert
		expect(result.size).toBe(2);
		expect(result.get("")).toBe(1);
		expect(result.get("01-sutta")).toBe(100);
		expect(result.get("01-sutta/02-diggha")).toBeUndefined();
	});

	it("ルートノードのみの場合、ルートページのみがマップに含まれる", () => {
		// Arrange
		const root: CategoryNode = {
			dirSegment: "",
			title: "Root",
			order: 0,
			children: new Map(),
		};
		const rootPage = { id: 1 } as { id: number };

		// Act
		const result = buildCategoryPageLookup(root, rootPage);

		// Assert
		expect(result.size).toBe(1);
		expect(result.get("")).toBe(1);
	});

	it("複数の階層を持つツリーを渡すと、すべてのpageIdが設定されたノードがマップに含まれる", () => {
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
						pageId: 100,
						children: new Map([
							[
								"02-diggha",
								{
									dirSegment: "02-diggha",
									title: "Diggha",
									order: 2,
									pageId: 200,
									children: new Map([
										[
											"03-sub",
											{
												dirSegment: "03-sub",
												title: "Sub",
												order: 3,
												pageId: 300,
												children: new Map(),
											},
										],
									]),
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
						pageId: 400,
						children: new Map(),
					},
				],
			]),
		};
		const rootPage = { id: 1 } as { id: number };

		// Act
		const result = buildCategoryPageLookup(root, rootPage);

		// Assert
		expect(result.size).toBe(5);
		expect(result.get("")).toBe(1);
		expect(result.get("01-sutta")).toBe(100);
		expect(result.get("01-sutta/02-diggha")).toBe(200);
		expect(result.get("01-sutta/02-diggha/03-sub")).toBe(300);
		expect(result.get("04-vinaya")).toBe(400);
	});
});
