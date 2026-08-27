import { describe, expect, test } from "vitest";
import type {
	ScriptureRow,
	SegmentRow,
	SqlExecutor,
	TranslationRow,
} from "../db/turso-types";
import { InvalidInputError } from "../domain/errors";
import { getScripture, listScriptures } from "./scriptures";

function createScriptureDb(
	options: {
		includeCrossPageAnnotation?: boolean;
		crossPageAnnotationPublished?: boolean;
	} = {},
) {
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
		{
			id: 5,
			slug: "orphan",
			title: "Orphan",
			source_locale: "pi",
			owner_user_id: null,
			parent_id: null,
			position: 4,
			published_at: "2026-01-01T00:00:00.000Z",
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
	if (options.includeCrossPageAnnotation) {
		scriptures.push({
			id: 4,
			slug: "commentary-page",
			title: "Commentary page",
			source_locale: "pi",
			owner_user_id: "owner-1",
			parent_id: 1,
			position: 3,
			published_at:
				options.crossPageAnnotationPublished === false
					? null
					: "2026-01-01T00:00:00.000Z",
		});
		segments.push({
			id: 12,
			scripture_id: 4,
			kind: "COMMENTARY",
			position: 0,
			source_text: "Commentary from another page",
			created_at: "2026-01-01T00:00:00.000Z",
		});
	}
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
			user_name: "Translator One",
			user_handle: "translator-one",
			user_profile: "",
			user_is_ai: 0,
			user_total_points: 10,
			owned_by_viewer: 0,
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
			user_name: "AI Translator",
			user_handle: "ai-translator",
			user_profile: "",
			user_is_ai: 1,
			user_total_points: 20,
			owned_by_viewer: 0,
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
			user_name: "Translator One",
			user_handle: "translator-one",
			user_profile: "",
			user_is_ai: 0,
			user_total_points: 10,
			owned_by_viewer: 0,
		},
	];
	if (options.includeCrossPageAnnotation) {
		translationRows.push({
			id: 103,
			segment_id: 12,
			locale: "ja",
			text: "別pageの注釈訳",
			point: 3,
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
			user_id: "translator-1",
			source: "USER",
			ai_job_id: null,
			owner_upvoted: 0,
			viewer_is_upvote: null,
			user_name: "Translator One",
			user_handle: "translator-one",
			user_profile: "",
			user_is_ai: 0,
			user_total_points: 10,
			owned_by_viewer: 0,
		});
	}
	const db: SqlExecutor = {
		async get<_T>(_sql: string, _args = []) {
			return undefined;
		},
		async all<T>(sql: string, args = []) {
			if (sql.includes("FROM segments AS annotation_segment")) {
				if (
					options.crossPageAnnotationPublished === false &&
					sql.includes("annotation_scripture.published_at IS NOT NULL")
				) {
					return [] as T[];
				}
				return options.includeCrossPageAnnotation
					? (segments.filter((segment) => segment.id === 12) as T[])
					: ([] as T[]);
			}
			if (sql.includes("FROM segment_annotation_links")) {
				const links = [
					{
						main_segment_id: 10,
						annotation_segment_id: 11,
						created_at: "2026-01-03T00:00:00.000Z",
					},
				];
				if (
					options.includeCrossPageAnnotation &&
					(options.crossPageAnnotationPublished !== false ||
						!sql.includes("annotation_scripture.published_at IS NOT NULL"))
				) {
					links.push({
						main_segment_id: 10,
						annotation_segment_id: 12,
						created_at: "2026-01-04T00:00:00.000Z",
					});
				}
				return links as T[];
			}
			if (
				sql.includes("published_at IS NOT NULL") &&
				!sql.includes("FROM translations AS t")
			) {
				return scriptures
					.filter(
						(scripture) =>
							scripture.published_at !== null && scripture.owner_user_id,
					)
					.map((scripture) => ({
						...scripture,
						owner_handle: scripture.owner_user_id as string,
					})) as T[];
			}
			if (sql.includes("COUNT(t.id) AS count")) {
				return [{ scripture_id: 2, count: 3 }] as T[];
			}
			if (sql.includes("SELECT id, scripture_id, kind")) {
				return segments.filter(
					(segment) => segment.scripture_id === Number(args[0]),
				) as T[];
			}
			if (sql.includes("SELECT DISTINCT t.locale")) {
				return [{ locale: "ja" }, { locale: "en" }] as T[];
			}
			if (sql.includes("FROM translations AS t")) return translationRows as T[];
			return [] as T[];
		},
		async run() {
			return { changes: 0, lastInsertRowid: undefined };
		},
	};
	return { db };
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
				ownerHandle: "owner-1",
				hierarchy: ["Root"],
				translationCount: 0,
				href: "/ja/owner-1/root",
			},
			{
				id: 2,
				slug: "child",
				title: "Child",
				sourceLocale: "pi",
				ownerHandle: "owner-1",
				hierarchy: ["Root", "Child"],
				translationCount: 3,
				href: "/ja/owner-1/child",
			},
		]);
	});

	test("詳細でsegments、COMMENTARY、翻訳候補、所有者順位、現在ユーザー票を返す", async () => {
		const { db } = createScriptureDb();
		const detail = await getScripture(db, {
			slug: "child",
			locale: "ja",
			viewerUserId: "viewer-1",
		});

		expect(detail).toMatchObject({
			id: 2,
			slug: "child",
			hierarchy: ["Root", "Child"],
			ownerHandle: "owner-1",
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
		expect(detail?.translations[0]).toMatchObject({
			userName: "AI Translator",
			userHandle: "ai-translator",
			userProfile: "",
			userIsAi: true,
			userTotalPoints: 20,
			ownedByViewer: false,
		});
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

	test("移行元の別pageに属する公開COMMENTARYリンクを詳細へ含める", async () => {
		const { db } = createScriptureDb({ includeCrossPageAnnotation: true });
		const detail = await getScripture(db, {
			slug: "child",
			locale: "ja",
		});

		expect(detail?.segments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 12,
					kind: "COMMENTARY",
					sourceText: "Commentary from another page",
					translations: [expect.objectContaining({ id: 103 })],
				}),
			]),
		);
		expect(detail?.annotationLinks).toContainEqual({
			mainSegmentId: 10,
			annotationSegmentId: 12,
			createdAt: "2026-01-04T00:00:00.000Z",
		});
	});

	test("別pageでも非公開scriptureのCOMMENTARYは詳細へ含めない", async () => {
		const { db } = createScriptureDb({
			includeCrossPageAnnotation: true,
			crossPageAnnotationPublished: false,
		});
		const detail = await getScripture(db, {
			slug: "child",
			locale: "ja",
		});

		expect(detail?.segments).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ id: 12 })]),
		);
		expect(detail?.annotationLinks).not.toContainEqual(
			expect.objectContaining({ annotationSegmentId: 12 }),
		);
	});
});
