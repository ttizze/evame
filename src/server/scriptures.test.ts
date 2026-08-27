import { describe, expect, test } from "vitest";
import type {
	ScriptureRow,
	SegmentRow,
	SqlExecutor,
	TranslationRow,
} from "../db/turso-types";
import { InvalidInputError } from "../domain/errors";
import { getScripture, listScriptures } from "./scriptures";
import { hashSessionToken } from "./session";

function createScriptureDb() {
	const sessionToken = "reader-session";
	const scriptures: ScriptureRow[] = [
		{
			id: 1,
			slug: "root",
			title: "Root",
			source_locale: "pi",
			owner_user_id: "owner-1",
			parent_id: null,
			position: 0,
			published_at: "2026-01-01T00:00:00.000Z",
		},
		{
			id: 2,
			slug: "child",
			title: "Child",
			source_locale: "pi",
			owner_user_id: "owner-1",
			parent_id: 1,
			position: 1,
			published_at: "2026-01-01T00:00:00.000Z",
		},
		{
			id: 3,
			slug: "draft",
			title: "Draft",
			source_locale: "pi",
			owner_user_id: null,
			parent_id: 1,
			position: 2,
			published_at: null,
		},
	];
	const segments: SegmentRow[] = [
		{
			id: 10,
			scripture_id: 2,
			kind: "PRIMARY",
			position: 0,
			source_text: "Source one",
			created_at: "2026-01-01T00:00:00.000Z",
		},
		{
			id: 11,
			scripture_id: 2,
			kind: "COMMENTARY",
			position: 1,
			source_text: "Commentary",
			created_at: "2026-01-01T00:00:00.000Z",
		},
	];
	const translationRows: TranslationRow[] = [
		{
			id: 100,
			segment_id: 10,
			locale: "ja",
			text: "高得点",
			point: 10,
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
			user_id: "translator-1",
			source: "USER",
			ai_job_id: null,
			owner_upvoted: 0,
			viewer_is_upvote: 1,
		},
		{
			id: 101,
			segment_id: 10,
			locale: "ja",
			text: "所有者推薦",
			point: 1,
			created_at: "2026-01-02T00:00:00.000Z",
			updated_at: "2026-01-02T00:00:00.000Z",
			user_id: "translator-2",
			source: "AI",
			ai_job_id: "job-1",
			owner_upvoted: 1,
			viewer_is_upvote: 0,
		},
		{
			id: 102,
			segment_id: 11,
			locale: "ja",
			text: "注釈訳",
			point: 2,
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
			user_id: "translator-1",
			source: "USER",
			ai_job_id: null,
			owner_upvoted: 0,
			viewer_is_upvote: null,
		},
	];
	const db: SqlExecutor = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("FROM sessions AS s")) {
				if (String(args[0]) !== (await hashSessionToken(sessionToken))) {
					return undefined;
				}
				return {
					id: "viewer-1",
					email: "viewer@example.com",
					name: "Viewer",
					expires_at: "2099-01-01T00:00:00.000Z",
				} as T;
			}
			return undefined;
		},
		async all<T>(sql: string) {
			if (
				sql.includes("published_at IS NOT NULL") &&
				!sql.includes("FROM translations AS t")
			) {
				return scriptures.filter(
					(scripture) => scripture.published_at !== null,
				) as T[];
			}
			if (sql.includes("COUNT(t.id) AS count")) {
				return [{ scripture_id: 2, count: 3 }] as T[];
			}
			if (sql.includes("SELECT id, scripture_id, kind")) return segments as T[];
			if (sql.includes("SELECT DISTINCT t.locale")) {
				return [{ locale: "ja" }, { locale: "en" }] as T[];
			}
			if (sql.includes("FROM segment_annotation_links")) {
				return [
					{
						main_segment_id: 10,
						annotation_segment_id: 11,
						created_at: "2026-01-03T00:00:00.000Z",
					},
				] as T[];
			}
			if (sql.includes("FROM translations AS t")) return translationRows as T[];
			return [] as T[];
		},
		async run() {
			return { changes: 0, lastInsertRowid: undefined };
		},
	};
	return { db, sessionToken };
}

describe("経典読取server function", () => {
	test("公開経典一覧で階層とlocale別の翻訳件数を返す", async () => {
		const { db } = createScriptureDb();
		await expect(listScriptures(db, { locale: "ja" })).resolves.toEqual([
			{
				id: 1,
				slug: "root",
				title: "Root",
				sourceLocale: "pi",
				hierarchy: ["Root"],
				translationCount: 0,
				href: "/ja/root",
			},
			{
				id: 2,
				slug: "child",
				title: "Child",
				sourceLocale: "pi",
				hierarchy: ["Root", "Child"],
				translationCount: 3,
				href: "/ja/child",
			},
		]);
	});

	test("詳細でsegments、COMMENTARY、翻訳候補、所有者順位、現在ユーザー票を返す", async () => {
		const { db, sessionToken } = createScriptureDb();
		const detail = await getScripture(db, {
			slug: "child",
			locale: "ja",
			sessionToken,
		});

		expect(detail).toMatchObject({
			id: 2,
			slug: "child",
			hierarchy: ["Root", "Child"],
			displayLocale: "ja",
			sourceText: "Source one",
			availableLocales: [
				{ code: "en", label: "English" },
				{ code: "ja", label: "日本語" },
				{ code: "pi", label: "Pāli" },
			],
		});
		expect(detail?.segments).toHaveLength(2);
		expect(detail?.segments[0]?.kind).toBe("PRIMARY");
		expect(detail?.segments[1]?.kind).toBe("COMMENTARY");
		expect(detail?.annotationLinks).toEqual([
			{
				mainSegmentId: 10,
				annotationSegmentId: 11,
				createdAt: "2026-01-03T00:00:00.000Z",
			},
		]);
		expect(detail?.translations.map((translation) => translation.id)).toEqual([
			101, 100, 102,
		]);
		expect(
			detail?.translations.map((translation) => translation.votedByViewer),
		).toEqual([false, true, null]);
	});

	test("未公開・不存在を返さず、不正な条件を拒否する", async () => {
		const { db } = createScriptureDb();
		expect(await getScripture(db, { slug: "draft", locale: "ja" })).toBeNull();
		expect(
			await getScripture(db, { slug: "missing", locale: "ja" }),
		).toBeNull();
		await expect(
			getScripture(db, { slug: "bad slug", locale: "ja" }),
		).rejects.toBeInstanceOf(InvalidInputError);
		await expect(listScriptures(db, { locale: "" })).rejects.toBeInstanceOf(
			InvalidInputError,
		);
		await expect(listScriptures(db, { locale: "eo" })).rejects.toBeInstanceOf(
			InvalidInputError,
		);
		await expect(
			getScripture(db, { slug: "child", locale: "pt-BR" }),
		).rejects.toBeInstanceOf(InvalidInputError);
	});
});
