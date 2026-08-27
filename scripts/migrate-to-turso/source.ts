import type { SourceSnapshot } from "./types";

export interface QueryResult<Row extends Record<string, unknown>> {
	rows: Row[];
}

export interface PostgresQueryClient {
	query<Row extends Record<string, unknown>>(
		queryText: string,
		values?: readonly unknown[],
	): Promise<QueryResult<Row>>;
}

/**
 * すべてのsource queryで同じ再帰CTEを使う。
 * `contents.kind = PAGE` と `status = PUBLIC` を木の各階層で確認するため、
 * コメントcontentや非公開の枝が混ざらない。
 */
const TIPITAKA_TREE_CTE = `
WITH RECURSIVE tipitaka_tree AS (
  SELECT
    p.id,
    p.slug,
    p.source_locale,
    p.user_id,
    p.parent_id,
    p."order" AS position,
    p.status,
    p.published_at,
    p.created_at,
    0 AS depth,
    ARRAY[p.id] AS ancestor_ids
  FROM pages p
  INNER JOIN contents c ON c.id = p.id AND c.kind = 'PAGE'
  WHERE p.slug = $1 AND p.status = 'PUBLIC'

  UNION ALL

  SELECT
    child.id,
    child.slug,
    child.source_locale,
    child.user_id,
    child.parent_id,
    child."order" AS position,
    child.status,
    child.published_at,
    child.created_at,
    parent.depth + 1,
    parent.ancestor_ids || child.id
  FROM pages child
  INNER JOIN contents child_content
    ON child_content.id = child.id AND child_content.kind = 'PAGE'
  INNER JOIN tipitaka_tree parent ON parent.id = child.parent_id
  WHERE child.status = 'PUBLIC'
    AND NOT child.id = ANY(parent.ancestor_ids)
)
`;

const PAGE_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT
  tree.id,
  'PAGE' AS content_kind,
  tree.slug,
  COALESCE(title_segment.text, tree.slug) AS title,
  tree.source_locale,
  tree.user_id AS owner_user_id,
  tree.parent_id,
  tree.position,
  tree.status,
  tree.published_at,
  tree.created_at,
  tree.depth
FROM tipitaka_tree tree
LEFT JOIN LATERAL (
  SELECT s.text
  FROM segments s
  WHERE s.content_id = tree.id AND s.number = 0
  ORDER BY s.id
  LIMIT 1
) title_segment ON TRUE
ORDER BY tree.depth, tree.parent_id NULLS FIRST, tree.position, tree.id
`;

const SEGMENT_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT
  s.id,
  s.content_id,
  s.number AS position,
  segment_type.key AS kind,
  s.text AS source_text,
  s.created_at
FROM segments s
INNER JOIN tipitaka_tree tree ON tree.id = s.content_id
INNER JOIN segment_types segment_type ON segment_type.id = s.segment_type_id
WHERE segment_type.key IN ('PRIMARY', 'COMMENTARY')
ORDER BY s.content_id, s.number, s.id
`;

const TRANSLATION_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT
  translation.id,
  translation.segment_id,
  translation.locale,
  translation.text,
  translation.point,
  translation.user_id,
  translation.created_at
FROM segment_translations translation
INNER JOIN segments s ON s.id = translation.segment_id
INNER JOIN tipitaka_tree tree ON tree.id = s.content_id
INNER JOIN segment_types segment_type ON segment_type.id = s.segment_type_id
WHERE segment_type.key IN ('PRIMARY', 'COMMENTARY')
ORDER BY translation.id
`;

const TRANSLATION_JOB_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT
  job.id,
  job.page_id,
  job.locale,
  job.ai_model AS model,
  job.status,
  job.progress,
  job.error,
  job.user_id AS requested_by,
  job.created_at,
  job.updated_at
FROM translation_jobs job
INNER JOIN tipitaka_tree tree ON tree.id = job.page_id
ORDER BY job.id
`;

const VOTE_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT
  vote.translation_id,
  vote.user_id,
  vote.is_upvote,
  vote.created_at,
  vote.updated_at
FROM translation_votes vote
INNER JOIN users voter ON voter.id = vote.user_id
INNER JOIN segment_translations translation
  ON translation.id = vote.translation_id
INNER JOIN segments s ON s.id = translation.segment_id
INNER JOIN tipitaka_tree tree ON tree.id = s.content_id
INNER JOIN segment_types segment_type ON segment_type.id = s.segment_type_id
WHERE segment_type.key IN ('PRIMARY', 'COMMENTARY')
ORDER BY vote.translation_id, vote.user_id
`;

const USER_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT DISTINCT
  candidate.id,
  candidate.email,
  candidate.name,
  candidate.is_ai,
  candidate.created_at
FROM users candidate
WHERE candidate.id IN (
  SELECT translation.user_id
  FROM segment_translations translation
  INNER JOIN segments s ON s.id = translation.segment_id
  INNER JOIN tipitaka_tree tree ON tree.id = s.content_id
  INNER JOIN segment_types segment_type ON segment_type.id = s.segment_type_id
  WHERE segment_type.key IN ('PRIMARY', 'COMMENTARY')
  UNION
  SELECT vote.user_id
  FROM translation_votes vote
  INNER JOIN segment_translations translation
    ON translation.id = vote.translation_id
  INNER JOIN segments s ON s.id = translation.segment_id
  INNER JOIN tipitaka_tree tree ON tree.id = s.content_id
  INNER JOIN segment_types segment_type ON segment_type.id = s.segment_type_id
  WHERE segment_type.key IN ('PRIMARY', 'COMMENTARY')
  UNION
  SELECT job.user_id
  FROM translation_jobs job
  INNER JOIN tipitaka_tree tree ON tree.id = job.page_id
  WHERE job.user_id IS NOT NULL
  UNION
  SELECT tree.user_id
  FROM tipitaka_tree tree
  WHERE tree.user_id IS NOT NULL
)
ORDER BY candidate.id
`;

const ANNOTATION_LINK_ROWS_QUERY = `${TIPITAKA_TREE_CTE}
SELECT
  link.main_segment_id,
  link.annotation_segment_id,
  link.created_at
FROM segment_annotation_links link
INNER JOIN segments main_segment ON main_segment.id = link.main_segment_id
INNER JOIN segments annotation_segment
  ON annotation_segment.id = link.annotation_segment_id
INNER JOIN tipitaka_tree main_tree ON main_tree.id = main_segment.content_id
INNER JOIN tipitaka_tree annotation_tree
  ON annotation_tree.id = annotation_segment.content_id
INNER JOIN segment_types main_type ON main_type.id = main_segment.segment_type_id
INNER JOIN segment_types annotation_type
  ON annotation_type.id = annotation_segment.segment_type_id
WHERE main_type.key IN ('PRIMARY', 'COMMENTARY')
  AND annotation_type.key IN ('PRIMARY', 'COMMENTARY')
ORDER BY link.main_segment_id, link.annotation_segment_id
`;

type PageRow = Record<string, unknown>;

function requiredNumber(row: PageRow, column: string): number {
	const value = row[column];
	const number = typeof value === "number" ? value : Number(value);
	if (!Number.isSafeInteger(number)) {
		throw new Error(`Invalid numeric source column: ${column}`);
	}
	return number;
}

function requiredString(row: PageRow, column: string): string {
	const value = row[column];
	if (typeof value !== "string") {
		throw new Error(`Invalid text source column: ${column}`);
	}
	return value;
}

function optionalString(row: PageRow, column: string): string | null {
	const value = row[column];
	if (value === null || value === undefined) return null;
	return requiredString(row, column);
}

function requiredBoolean(row: PageRow, column: string): boolean {
	const value = row[column];
	if (typeof value !== "boolean") {
		throw new Error(`Invalid boolean source column: ${column}`);
	}
	return value;
}

function requiredTimestamp(
	row: PageRow,
	column: string,
): string | Date | number {
	const value = row[column];
	if (
		typeof value !== "string" &&
		typeof value !== "number" &&
		!(value instanceof Date)
	) {
		throw new Error(`Invalid timestamp source column: ${column}`);
	}
	return value;
}

function optionalTimestamp(
	row: PageRow,
	column: string,
): string | Date | number | null {
	const value = row[column];
	if (value === null || value === undefined) return null;
	return requiredTimestamp(row, column);
}

function optionalNumber(row: PageRow, column: string): number | null {
	const value = row[column];
	if (value === null || value === undefined) return null;
	return requiredNumber(row, column);
}

/**
 * PostgreSQLの公開Tipitaka部分だけを一貫したSourceSnapshotへ読み込む。
 * SQLはすべて固定文で、入力値はroot slugのプレースホルダだけに渡す。
 */
export async function loadSourceSnapshot(
	client: PostgresQueryClient,
	rootSlug = "tipitaka",
): Promise<SourceSnapshot> {
	const [
		pageResult,
		segmentResult,
		translationResult,
		jobResult,
		userResult,
		voteResult,
		linkResult,
	] = await Promise.all([
		client.query<PageRow>(PAGE_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(SEGMENT_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(TRANSLATION_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(TRANSLATION_JOB_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(USER_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(VOTE_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(ANNOTATION_LINK_ROWS_QUERY, [rootSlug]),
	]);

	const pages = pageResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		contentKind: requiredString(row, "content_kind") as "PAGE",
		slug: requiredString(row, "slug"),
		title: requiredString(row, "title"),
		sourceLocale: requiredString(row, "source_locale"),
		ownerUserId: optionalString(row, "owner_user_id"),
		parentId: optionalNumber(row, "parent_id"),
		position: requiredNumber(row, "position"),
		status: requiredString(row, "status"),
		publishedAt: optionalTimestamp(row, "published_at"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const segments = segmentResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		contentId: requiredNumber(row, "content_id"),
		position: requiredNumber(row, "position"),
		kind: requiredString(row, "kind"),
		sourceText: requiredString(row, "source_text"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const translations = translationResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		segmentId: requiredNumber(row, "segment_id"),
		locale: requiredString(row, "locale"),
		text: requiredString(row, "text"),
		point: requiredNumber(row, "point"),
		userId: requiredString(row, "user_id"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const translationJobs = jobResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		pageId: requiredNumber(row, "page_id"),
		locale: requiredString(row, "locale"),
		model: requiredString(row, "model"),
		status: requiredString(row, "status"),
		progress: requiredNumber(row, "progress"),
		error: requiredString(row, "error"),
		requestedBy:
			row.requested_by === null || row.requested_by === undefined
				? null
				: requiredString(row, "requested_by"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const users = userResult.rows.map((row) => ({
		id: requiredString(row, "id"),
		email: requiredString(row, "email"),
		name: requiredString(row, "name"),
		isAi: requiredBoolean(row, "is_ai"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const votes = voteResult.rows.map((row) => ({
		translationId: requiredNumber(row, "translation_id"),
		userId: requiredString(row, "user_id"),
		isUpvote: requiredBoolean(row, "is_upvote"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const annotationLinks = linkResult.rows.map((row) => ({
		mainSegmentId: requiredNumber(row, "main_segment_id"),
		annotationSegmentId: requiredNumber(row, "annotation_segment_id"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	return {
		pages,
		segments,
		translations,
		translationJobs,
		users,
		votes,
		annotationLinks,
	};
}

export interface PostgresSource {
	load(rootSlug?: string): Promise<SourceSnapshot>;
	close(): Promise<void>;
}

/**
 * CLIからのみ呼び出すPostgreSQL接続。DATABASE_URLは接続にだけ使い、
 * ログやエラーへ値を展開しない。
 */
export async function createPostgresSource(
	databaseUrl = process.env.DATABASE_URL,
): Promise<PostgresSource> {
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required for PostgreSQL source");
	}
	const { Pool } = await import("pg");
	const pool = new Pool({ connectionString: databaseUrl });
	return {
		load: (rootSlug = "tipitaka") => loadSourceSnapshot(pool, rootSlug),
		close: () => pool.end(),
	};
}

export const sourceQueries = {
	page: PAGE_ROWS_QUERY,
	segment: SEGMENT_ROWS_QUERY,
	translation: TRANSLATION_ROWS_QUERY,
	translationJob: TRANSLATION_JOB_ROWS_QUERY,
	user: USER_ROWS_QUERY,
	vote: VOTE_ROWS_QUERY,
	annotationLink: ANNOTATION_LINK_ROWS_QUERY,
} as const;
