import type { ScriptureRow, SegmentRow, SqlExecutor } from "../db/turso-types";
import { InvalidInputError } from "../domain/errors";
import { supportedLocales } from "../domain/locales";
import { buildScriptureHierarchy } from "../domain/scripture";
import {
	parseLocale,
	parseNonEmptyText,
	parseSupportedLocale,
	rankTranslations,
} from "../domain/vote";
import {
	listTranslationsForSegments,
	type TranslationCandidate,
} from "./translations";

export type ScriptureListItem = {
	id: number;
	slug: string;
	title: string;
	sourceLocale: string;
	ownerHandle: string;
	hierarchy: string[];
	translationCount: number;
	href: string;
};

export type ScriptureSegment = {
	id: number;
	kind: SegmentRow["kind"];
	position: number;
	sourceText: string;
	translations: TranslationCandidate[];
};

export type SegmentAnnotationLink = {
	mainSegmentId: number;
	annotationSegmentId: number;
	createdAt: string;
};

export type ScriptureDetail = {
	id: number;
	slug: string;
	title: string;
	sourceLocale: string;
	ownerHandle: string;
	displayLocale: string;
	hierarchy: string[];
	sourceText: string;
	segments: ScriptureSegment[];
	translations: TranslationCandidate[];
	annotationLinks: SegmentAnnotationLink[];
	availableLocales: Array<{ code: string; label: string }>;
};

const LOCALE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
	supportedLocales.map((locale) => [locale.code, locale.label]),
);

function parseReadInput(input: unknown): {
	locale: string;
	viewerUserId: string | null;
} {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("経典の読み取り条件が不正です");
	}
	const value = input as Record<string, unknown>;
	const viewerUserId = value.viewerUserId;
	if (
		viewerUserId !== undefined &&
		viewerUserId !== null &&
		(typeof viewerUserId !== "string" || viewerUserId.trim().length === 0)
	) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	return {
		locale: parseSupportedLocale(value.locale),
		viewerUserId: viewerUserId === undefined ? null : viewerUserId,
	};
}

function parseSlug(value: unknown): string {
	const slug = parseNonEmptyText(value, "slug");
	if (slug.length > 200 || !/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(slug)) {
		throw new InvalidInputError("slug が不正です");
	}
	return slug;
}

function readCount(value: unknown): number {
	const count = typeof value === "bigint" ? Number(value) : value;
	if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
		throw new InvalidInputError("翻訳件数が不正です");
	}
	return count;
}

function normalizedTitle(row: Pick<ScriptureRow, "title" | "slug">): string {
	return row.title.trim() || row.slug;
}

function hierarchyRows(rows: readonly ScriptureRow[]) {
	return rows.map((row) => ({
		id: row.id,
		title: normalizedTitle(row),
		parent_id: row.parent_id,
	}));
}

async function readPublishedScriptures(
	db: SqlExecutor,
): Promise<Array<ScriptureRow & { owner_handle: string }>> {
	return db.all<ScriptureRow & { owner_handle: string }>(
		`SELECT scriptures.id, scriptures.slug, scriptures.title,
				scriptures.source_locale, scriptures.owner_user_id,
				scriptures.parent_id, scriptures.position, scriptures.published_at,
				users.handle AS owner_handle
		 FROM scriptures
		 INNER JOIN users ON users.id = scriptures.owner_user_id
		 WHERE scriptures.published_at IS NOT NULL
		 ORDER BY scriptures.position, scriptures.id`,
	);
}

async function readTranslationCounts(
	db: SqlExecutor,
	locale: string,
): Promise<Map<number, number>> {
	const rows = await db.all<{ scripture_id: number; count: number | bigint }>(
		`SELECT s.scripture_id, COUNT(t.id) AS count
		 FROM segments AS s
		 LEFT JOIN translations AS t
			ON t.segment_id = s.id AND t.locale = ?
		 GROUP BY s.scripture_id`,
		[locale],
	);
	return new Map(rows.map((row) => [row.scripture_id, readCount(row.count)]));
}

function listItem(
	row: ScriptureRow & { owner_handle: string },
	rows: ReadonlyArray<ScriptureRow & { owner_handle: string }>,
	translationCounts: ReadonlyMap<number, number>,
	locale: string,
): ScriptureListItem {
	return {
		id: row.id,
		slug: row.slug,
		title: normalizedTitle(row),
		sourceLocale: row.source_locale,
		ownerHandle: row.owner_handle,
		hierarchy: buildScriptureHierarchy(row, hierarchyRows(rows)),
		translationCount: translationCounts.get(row.id) ?? 0,
		href: `/${locale}/${row.owner_handle}/${row.slug}`,
	};
}

export async function listScriptures(
	db: SqlExecutor,
	input: unknown,
): Promise<ScriptureListItem[]> {
	const { locale } = parseReadInput(input);
	const rows = await readPublishedScriptures(db);
	const translationCounts = await readTranslationCounts(db, locale);
	return rows.map((row) => listItem(row, rows, translationCounts, locale));
}

function parseSearchInput(input: unknown): {
	locale: string;
	query: string;
	category: "title" | "content";
} {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("仏典の検索条件が不正です");
	}
	const value = input as Record<string, unknown>;
	const query = value.query;
	if (typeof query !== "string") {
		throw new InvalidInputError("検索語が不正です");
	}
	const normalizedQuery = query.trim();
	if (normalizedQuery.length > 200) {
		throw new InvalidInputError("検索語が長すぎます");
	}
	const category = value.category ?? "title";
	if (category !== "title" && category !== "content") {
		throw new InvalidInputError("検索対象が不正です");
	}
	return {
		locale: parseSupportedLocale(value.locale),
		query: normalizedQuery,
		category,
	};
}

/** 公開済み仏典を題名・slug・公開本文から検索する。 */
export async function searchScriptures(
	db: SqlExecutor,
	input: unknown,
): Promise<ScriptureListItem[]> {
	const { category, locale, query } = parseSearchInput(input);
	if (query.length === 0) return [];

	const pattern = `%${query}%`;
	const searchCondition =
		category === "title"
			? "lower(scriptures.title) LIKE lower(?) OR lower(scriptures.slug) LIKE lower(?)"
			: "lower(COALESCE(segments.source_text, '')) LIKE lower(?)";
	const searchArguments = category === "title" ? [pattern, pattern] : [pattern];
	const matchedRows = await db.all<{ id: number }>(
		`SELECT DISTINCT scriptures.id
		 FROM scriptures
		 LEFT JOIN segments ON segments.scripture_id = scriptures.id
		 WHERE scriptures.published_at IS NOT NULL
			AND (${searchCondition})
		 ORDER BY scriptures.position, scriptures.id`,
		searchArguments,
	);
	if (matchedRows.length === 0) return [];

	const rows = await readPublishedScriptures(db);
	const matchedIds = new Set(matchedRows.map(({ id }) => id));
	const matchedScriptures = rows.filter((row) => matchedIds.has(row.id));
	const translationCounts = await readTranslationCounts(db, locale);
	return matchedScriptures.map((row) =>
		listItem(row, rows, translationCounts, locale),
	);
}

function localeLabel(code: string): string {
	return LOCALE_LABELS[code] ?? code;
}

async function availableLocales(
	db: SqlExecutor,
	scriptureId: number,
	sourceLocale: string,
): Promise<Array<{ code: string; label: string }>> {
	const rows = await db.all<{ locale: string }>(
		`SELECT DISTINCT t.locale
		 FROM translations AS t
		 INNER JOIN segments AS s ON s.id = t.segment_id
		 WHERE s.scripture_id = ?
		 ORDER BY t.locale`,
		[scriptureId],
	);
	const locales = new Set([
		sourceLocale,
		...rows.map((row) => parseLocale(row.locale)),
	]);
	return [...locales]
		.sort()
		.map((code) => ({ code, label: localeLabel(code) }));
}

async function readAnnotationLinks(
	db: SqlExecutor,
	scriptureId: number,
	segmentIds: readonly number[],
): Promise<SegmentAnnotationLink[]> {
	if (segmentIds.length === 0) return [];
	const placeholders = segmentIds.map(() => "?").join(", ");
	const rows = await db.all<{
		main_segment_id: number;
		annotation_segment_id: number;
		created_at: string;
	}>(
		`SELECT link.main_segment_id, link.annotation_segment_id, link.created_at
		 FROM segment_annotation_links AS link
		 INNER JOIN segments AS main_segment
			ON main_segment.id = link.main_segment_id
		 INNER JOIN scriptures AS main_scripture
			ON main_scripture.id = main_segment.scripture_id
		 INNER JOIN segments AS annotation_segment
			ON annotation_segment.id = link.annotation_segment_id
		 INNER JOIN scriptures AS annotation_scripture
			ON annotation_scripture.id = annotation_segment.scripture_id
		 WHERE main_segment.scripture_id = ?
			AND main_segment.id IN (${placeholders})
			AND main_scripture.published_at IS NOT NULL
			AND annotation_segment.kind = 'COMMENTARY'
			AND annotation_scripture.published_at IS NOT NULL
		 ORDER BY link.main_segment_id, link.annotation_segment_id`,
		[scriptureId, ...segmentIds],
	);
	return rows.map((row) => ({
		mainSegmentId: row.main_segment_id,
		annotationSegmentId: row.annotation_segment_id,
		createdAt: row.created_at,
	}));
}

async function readAnnotationSegments(
	db: SqlExecutor,
	segmentIds: readonly number[],
): Promise<SegmentRow[]> {
	if (segmentIds.length === 0) return [];
	const placeholders = segmentIds.map(() => "?").join(", ");
	return db.all<SegmentRow>(
		`SELECT annotation_segment.id, annotation_segment.scripture_id,
				annotation_segment.kind, annotation_segment.position,
				annotation_segment.source_text, annotation_segment.created_at
		 FROM segments AS annotation_segment
		 INNER JOIN scriptures AS annotation_scripture
			ON annotation_scripture.id = annotation_segment.scripture_id
		 WHERE annotation_segment.id IN (${placeholders})
			AND annotation_segment.kind = 'COMMENTARY'
			AND annotation_scripture.published_at IS NOT NULL
		 ORDER BY annotation_segment.position, annotation_segment.id`,
		segmentIds,
	);
}

export async function getScripture(
	db: SqlExecutor,
	input: unknown,
): Promise<ScriptureDetail | null> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("経典の読み取り条件が不正です");
	}
	const value = input as Record<string, unknown>;
	const slug = parseSlug(value.slug);
	const { locale, viewerUserId } = parseReadInput(value);
	const rows = await readPublishedScriptures(db);
	const scripture = rows.find((row) => row.slug === slug);
	if (!scripture) return null;

	const mainSegments = await db.all<SegmentRow>(
		`SELECT id, scripture_id, kind, position, source_text, created_at
		 FROM segments
		 WHERE scripture_id = ?
		 ORDER BY position, id`,
		[scripture.id],
	);
	const mainSegmentIds = mainSegments.map((segment) => segment.id);
	const annotationLinks = await readAnnotationLinks(
		db,
		scripture.id,
		mainSegmentIds,
	);
	const annotationSegmentIds = [
		...new Set(annotationLinks.map((link) => link.annotationSegmentId)),
	];
	const linkedAnnotationSegments = await readAnnotationSegments(
		db,
		annotationSegmentIds,
	);
	const mainSegmentIdSet = new Set(mainSegmentIds);
	const segments = [
		...mainSegments,
		...linkedAnnotationSegments.filter(
			(segment) => !mainSegmentIdSet.has(segment.id),
		),
	];
	const translations = await listTranslationsForSegments(
		db,
		segments.map((segment) => segment.id),
		locale,
		viewerUserId,
	);
	const translationsBySegment = new Map<number, TranslationCandidate[]>();
	for (const translation of translations) {
		const candidates = translationsBySegment.get(translation.segmentId) ?? [];
		candidates.push(translation);
		translationsBySegment.set(translation.segmentId, candidates);
	}
	const scriptureSegments = segments.map((segment) => ({
		id: segment.id,
		kind: segment.kind,
		position: segment.position,
		sourceText: segment.source_text,
		translations: rankTranslations(translationsBySegment.get(segment.id) ?? []),
	}));
	const primarySegments = scriptureSegments.filter(
		(segment) => mainSegmentIdSet.has(segment.id) && segment.kind === "PRIMARY",
	);
	const mainScriptureSegments = scriptureSegments.filter((segment) =>
		mainSegmentIdSet.has(segment.id),
	);
	const sourceSegments =
		primarySegments.length > 0 ? primarySegments : mainScriptureSegments;

	return {
		id: scripture.id,
		slug: scripture.slug,
		title: normalizedTitle(scripture),
		sourceLocale: scripture.source_locale,
		ownerHandle: scripture.owner_handle,
		displayLocale: locale,
		hierarchy: buildScriptureHierarchy(scripture, hierarchyRows(rows)),
		sourceText: sourceSegments
			.map((segment) => segment.sourceText)
			.join("\n\n"),
		segments: scriptureSegments,
		translations: scriptureSegments.flatMap((segment) => segment.translations),
		annotationLinks,
		availableLocales: await availableLocales(
			db,
			scripture.id,
			scripture.source_locale,
		),
	};
}
