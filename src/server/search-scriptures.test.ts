import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "@/db/turso-types";
import { InvalidInputError } from "@/domain/errors";
import { searchScriptures } from "./scriptures";

const rows = [
	{
		id: 1,
		slug: "dhammapada",
		title: "Dhammapada",
		source_locale: "pi",
		owner_user_id: "owner-id",
		parent_id: null,
		position: 1,
		published_at: "2026-01-01T00:00:00.000Z",
		owner_handle: "tipitaka",
	},
	{
		id: 2,
		slug: "hidden",
		title: "Hidden scripture",
		source_locale: "pi",
		owner_user_id: "owner-id",
		parent_id: null,
		position: 2,
		published_at: null,
		owner_handle: "tipitaka",
	},
];

function createDatabase(): SqlExecutor {
	return {
		async all<T>(sql: string) {
			if (sql.includes("SELECT DISTINCT scriptures.id")) {
				return [{ id: 1 }] as T[];
			}
			if (sql.includes("SELECT scriptures.id, scriptures.slug")) {
				return rows as T[];
			}
			if (sql.includes("COUNT(t.id)")) return [] as T[];
			throw new Error(`unexpected SQL: ${sql}`);
		},
		async get() {
			return undefined;
		},
		async run() {
			return { changes: 0, lastInsertRowid: undefined };
		},
	};
}

describe("公開仏典検索", () => {
	it("題名や原文に一致した公開済み仏典だけを一覧形式で返す", async () => {
		const result = await searchScriptures(createDatabase(), {
			category: "title",
			locale: "ja",
			query: "Dhamma",
		});

		expect(result).toEqual([
			{
				id: 1,
				slug: "dhammapada",
				title: "Dhammapada",
				sourceLocale: "pi",
				ownerHandle: "tipitaka",
				hierarchy: ["Dhammapada"],
				translationCount: 0,
				href: "/ja/tipitaka/dhammapada",
			},
		]);
	});

	it("空の検索語では全件検索せず空配列を返す", async () => {
		const db = createDatabase();
		const result = await searchScriptures(db, { locale: "en", query: "  " });

		expect(result).toEqual([]);
	});

	it("未対応localeや長すぎる検索語を拒否する", async () => {
		await expect(
			searchScriptures(createDatabase(), {
				category: "title",
				locale: "xx",
				query: "sutta",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
		await expect(
			searchScriptures(createDatabase(), {
				category: "title",
				locale: "en",
				query: "x".repeat(201),
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
	});
});
