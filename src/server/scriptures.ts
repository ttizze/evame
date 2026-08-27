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
import { getSessionUser } from "./session";
import {
	listTranslationsForSegments,
	type TranslationCandidate,
} from "./translations";

export type ScriptureListItem = {
	id: number;
	slug: string;
	title: string;
	sourceLocale: string;
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
	sessionToken: string | null;
} {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("経典の読み取り条件が不正です");
	}
	const value = input as Record<string, unknown>;
	const sessionToken = value.sessionToken;
	if (
		sessionToken !== undefined &&
		sessionToken !== null &&
		(typeof sessionToken !== "string" || sessionToken.trim().length === 0)
	) {
		throw new InvalidInputError("セッショントークンが不正です");
	}
	return {
		locale: parseSupportedLocale(value.locale),
		sessionToken: sessionToken === undefined ? null : sessionToken,
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

async function readViewerId(
	db: SqlExecutor,
	sessionToken: string | null,
): Promise<string | null> {
	if (sessionToken === null) return null;
	const user = await getSessionUser(db, sessionToken);
	return user?.id ?? null;
}

async function readPublishedScriptures(
	db: SqlExecutor,
): Promise<ScriptureRow[]> {
	return db.all<ScriptureRow>(
		`SELECT id, slug, title, source_locale, owner_user_id, parent_id,
				position, published_at
		 FROM scriptures
		 WHERE published_at IS NOT NULL
		 ORDER BY position, id`,
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
	row: ScriptureRow,
	rows: readonly ScriptureRow[],
	translationCounts: ReadonlyMap<number, number>,
	locale: string,
): ScriptureListItem {
	return {
		id: row.id,
		slug: row.slug,
		title: normalizedTitle(row),
		sourceLocale: row.source_locale,
		hierarchy: buildScriptureHierarchy(row, hierarchyRows(rows)),
		translationCount: translationCounts.get(row.id) ?? 0,
		href: `/${locale}/${row.slug}`,
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
	segmentIds: readonly number[],
): Promise<SegmentAnnotationLink[]> {
	if (segmentIds.length === 0) return [];
	const placeholders = segmentIds.map(() => "?").join(", ");
	const rows = await db.all<{
		main_segment_id: number;
		annotation_segment_id: number;
		created_at: string;
	}>(
		`SELECT main_segment_id, annotation_segment_id, created_at
		 FROM segment_annotation_links
		 WHERE main_segment_id IN (${placeholders})
			AND annotation_segment_id IN (${placeholders})
		 ORDER BY main_segment_id, annotation_segment_id`,
		[...segmentIds, ...segmentIds],
	);
	return rows.map((row) => ({
		mainSegmentId: row.main_segment_id,
		annotationSegmentId: row.annotation_segment_id,
		createdAt: row.created_at,
	}));
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
	const { locale, sessionToken } = parseReadInput(value);
	const rows = await readPublishedScriptures(db);
	const scripture = rows.find((row) => row.slug === slug);
	if (!scripture) return null;

	const viewerUserId = await readViewerId(db, sessionToken);
	const segments = await db.all<SegmentRow>(
		`SELECT id, scripture_id, kind, position, source_text, created_at
		 FROM segments
		 WHERE scripture_id = ?
		 ORDER BY position, id`,
		[scripture.id],
	);
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
		(segment) => segment.kind === "PRIMARY",
	);
	const sourceSegments =
		primarySegments.length > 0 ? primarySegments : scriptureSegments;
	const annotationLinks = await readAnnotationLinks(
		db,
		segments.map((segment) => segment.id),
	);

	return {
		id: scripture.id,
		slug: scripture.slug,
		title: normalizedTitle(scripture),
		sourceLocale: scripture.source_locale,
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
