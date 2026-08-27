import { describe, expect, test } from "vitest";
import type { SqlExecutor } from "../db/turso-types";
import { listChildScriptures } from "./scripture-tree";

describe("scriptureの子ページツリー", () => {
	test("公開済みの子孫をposition順の階層へ組み立てる", async () => {
		let query = "";
		const db: SqlExecutor = {
			async get() {
				return undefined;
			},
			async all<T>(sql: string) {
				query = sql;
				return [
					{
						id: 3,
						slug: "grandchild",
						title: "Grandchild",
						parent_id: 2,
						position: 0,
						owner_handle: "owner",
					},
					{
						id: 2,
						slug: "child",
						title: "Child",
						parent_id: 1,
						position: 2,
						owner_handle: "owner",
					},
					{
						id: 4,
						slug: "second",
						title: "Second",
						parent_id: 1,
						position: 3,
						owner_handle: "owner",
					},
				] as T[];
			},
			async run() {
				return { changes: 0, lastInsertRowid: undefined };
			},
		};

		expect(
			await listChildScriptures(db, { parentId: 1, locale: "ja" }),
		).toEqual([
			{
				id: 2,
				slug: "child",
				title: "Child",
				parentId: 1,
				position: 2,
				ownerHandle: "owner",
				href: "/ja/owner/child",
				children: [
					{
						id: 3,
						slug: "grandchild",
						title: "Grandchild",
						parentId: 2,
						position: 0,
						ownerHandle: "owner",
						href: "/ja/owner/grandchild",
						children: [],
					},
				],
			},
			{
				id: 4,
				slug: "second",
				title: "Second",
				parentId: 1,
				position: 3,
				ownerHandle: "owner",
				href: "/ja/owner/second",
				children: [],
			},
		]);
		expect(query).toContain("WITH RECURSIVE descendants");
		expect(query).toContain("published_at IS NOT NULL");
	});
});
