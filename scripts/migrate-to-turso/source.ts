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
 * `contents.kind = PAGE`、`status = ARCHIVE`、`source_locale = pi` を木の各階層で
 * 確認するため、一般記事やコメントcontent、別状態の枝が混ざらない。
 */
const TIPITAKA_TREE_CTE = `
WITH RECURSIVE tipitaka_tree AS (
  SELECT
    p.id,
    p.slug,
    p.source_locale,
    p.user_id,
    c.import_file_id,
    p.parent_id,
    p."order" AS position,
    p.status,
    p.published_at,
    p.created_at,
    0 AS depth,
    ARRAY[p.id] AS ancestor_ids
  FROM pages p
  INNER JOIN contents c ON c.id = p.id AND c.kind = 'PAGE'
  WHERE p.slug = $1 AND p.status = 'ARCHIVE' AND p.source_locale = 'pi'

  UNION ALL

  SELECT
    child.id,
    child.slug,
    child.source_locale,
    child.user_id,
    child_content.import_file_id,
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
  WHERE child.status = 'ARCHIVE'
    AND child.source_locale = 'pi'
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
  tree.import_file_id,
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
  s.segment_type_id,
  segment_type.key AS kind,
  s.text AS source_text,
  s.text_and_occurrence_hash,
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
  '' AS translation_context,
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

const USER_ROWS_QUERY = `
SELECT
  id,
  email,
  name,
  handle,
  profile,
  total_points,
  is_ai,
  image,
  plan,
  provider,
  twitter_handle,
  email_verified,
  created_at,
  updated_at
FROM users
ORDER BY id
`;

const ACCOUNT_ROWS_QUERY = `
SELECT
  id,
  user_id,
  provider_id,
  account_id,
  refresh_token,
  access_token,
  scope,
  id_token,
  password,
  refresh_token_expires_at,
  access_token_expires_at,
  created_at,
  updated_at
FROM accounts
ORDER BY id
`;

const SESSION_ROWS_QUERY = `
SELECT
  id,
  token,
  user_id,
  expires_at,
  ip_address,
  user_agent,
  created_at,
  updated_at
FROM sessions
ORDER BY id
`;

const VERIFICATION_ROWS_QUERY = `
SELECT
  id,
  identifier,
  value,
  expires_at,
  created_at,
  updated_at
FROM verifications
ORDER BY id
`;

const GEMINI_API_KEY_ROWS_QUERY = `
SELECT
  id,
  user_id,
  api_key
FROM gemini_api_keys
ORDER BY id
`;

const PERSONAL_ACCESS_TOKEN_ROWS_QUERY = `
SELECT
  id,
  key_hash,
  user_id,
  name,
  created_at,
  last_used_at
FROM personal_access_tokens
ORDER BY id
`;

const IMPORT_RUN_ROWS_QUERY = `
SELECT
  id,
  started_at,
  finished_at,
  status
FROM import_runs
ORDER BY id
`;

const IMPORT_FILE_ROWS_QUERY = `
SELECT
  id,
  import_run_id,
  path,
  checksum,
  status,
  message,
  created_at
FROM import_files
ORDER BY id
`;

const LIKE_PAGE_ROWS_QUERY = `
SELECT
  id,
  page_id,
  created_at,
  user_id
FROM like_pages
ORDER BY id
`;

const NOTIFICATION_ROWS_QUERY = `
SELECT
  id,
  user_id,
  type,
  read,
  created_at,
  actor_id,
  page_comment_id,
  page_id,
  segment_translation_id
FROM notifications
ORDER BY id
`;

const SEGMENT_TYPE_ROWS_QUERY = `
SELECT
  id,
  label,
  key
FROM segment_types
ORDER BY id
`;

const PAGE_LOCALE_TRANSLATION_PROOF_ROWS_QUERY = `
SELECT
  id,
  page_id,
  locale,
  translation_proof_status
FROM page_locale_translation_proofs
ORDER BY id
`;

const SEGMENT_METADATA_TYPE_ROWS_QUERY = `
SELECT
  id,
  key,
  label
FROM segment_metadata_types
ORDER BY id
`;

const TAG_ROWS_QUERY = `
SELECT
  id,
  name
FROM tags
ORDER BY id
`;

const TRANSLATION_CONTEXT_ROWS_QUERY = `
SELECT
  id,
  user_id,
  name,
  context,
  created_at,
  updated_at
FROM translation_contexts
ORDER BY id
`;

const PAGE_VIEW_ROWS_QUERY = `
SELECT
  page_id,
  count
FROM page_views
ORDER BY page_id
`;

const SEGMENT_METADATA_ROWS_QUERY = `
SELECT
  id,
  segment_id,
  metadata_type_id,
  value,
  created_at
FROM segment_metadata
ORDER BY id
`;

const USER_SETTINGS_ROWS_QUERY = `
SELECT
  id,
  user_id,
  target_locales,
  created_at,
  updated_at
FROM user_settings
ORDER BY id
`;

const TAG_PAGE_ROWS_QUERY = `
SELECT
  tag_id,
  page_id
FROM tag_pages
ORDER BY tag_id, page_id
`;

/**
 * 移行で参照する旧schemaの列を、本番接続の直前に確認する。
 * Gemini API keyには旧schemaで確認できた3列だけを要求し、存在を確認して
 * いないtimestamp列を移行SQLへ混ぜない。
 */
export const sourceSchemaRequirements = {
	contents: ["id", "kind", "import_file_id"],
	pages: [
		"id",
		"slug",
		"source_locale",
		"user_id",
		"parent_id",
		"order",
		"status",
		"published_at",
		"created_at",
	],
	segments: [
		"id",
		"content_id",
		"number",
		"segment_type_id",
		"text",
		"text_and_occurrence_hash",
		"created_at",
	],
	segment_types: ["id", "label", "key"],
	segment_translations: [
		"id",
		"segment_id",
		"locale",
		"text",
		"point",
		"user_id",
		"created_at",
	],
	translation_jobs: [
		"id",
		"page_id",
		"locale",
		"ai_model",
		"status",
		"progress",
		"error",
		"user_id",
		"created_at",
		"updated_at",
	],
	translation_votes: [
		"translation_id",
		"user_id",
		"is_upvote",
		"created_at",
		"updated_at",
	],
	users: [
		"id",
		"email",
		"name",
		"handle",
		"profile",
		"total_points",
		"is_ai",
		"image",
		"plan",
		"provider",
		"twitter_handle",
		"email_verified",
		"created_at",
		"updated_at",
	],
	accounts: [
		"id",
		"user_id",
		"provider_id",
		"account_id",
		"refresh_token",
		"access_token",
		"scope",
		"id_token",
		"password",
		"refresh_token_expires_at",
		"access_token_expires_at",
		"created_at",
		"updated_at",
	],
	sessions: [
		"id",
		"token",
		"user_id",
		"expires_at",
		"ip_address",
		"user_agent",
		"created_at",
		"updated_at",
	],
	verifications: [
		"id",
		"identifier",
		"value",
		"expires_at",
		"created_at",
		"updated_at",
	],
	gemini_api_keys: ["id", "user_id", "api_key"],
	personal_access_tokens: [
		"id",
		"key_hash",
		"user_id",
		"name",
		"created_at",
		"last_used_at",
	],
	import_runs: ["id", "started_at", "finished_at", "status"],
	import_files: [
		"id",
		"import_run_id",
		"path",
		"checksum",
		"status",
		"message",
		"created_at",
	],
	like_pages: ["id", "page_id", "created_at", "user_id"],
	notifications: [
		"id",
		"user_id",
		"type",
		"read",
		"created_at",
		"actor_id",
		"page_comment_id",
		"page_id",
		"segment_translation_id",
	],
	page_locale_translation_proofs: [
		"id",
		"page_id",
		"locale",
		"translation_proof_status",
	],
	segment_metadata_types: ["id", "key", "label"],
	tags: ["id", "name"],
	translation_contexts: [
		"id",
		"user_id",
		"name",
		"context",
		"created_at",
		"updated_at",
	],
	page_views: ["page_id", "count"],
	segment_metadata: [
		"id",
		"segment_id",
		"metadata_type_id",
		"value",
		"created_at",
	],
	user_settings: [
		"id",
		"user_id",
		"target_locales",
		"created_at",
		"updated_at",
	],
	tag_pages: ["tag_id", "page_id"],
	segment_annotation_links: [
		"main_segment_id",
		"annotation_segment_id",
		"created_at",
	],
} as const;

const SOURCE_SCHEMA_PREFLIGHT_QUERY = `
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = ANY($1::text[])
ORDER BY table_name, ordinal_position
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

function optionalBoolean(row: PageRow, column: string): boolean | null {
	const value = row[column];
	if (value === null || value === undefined) return null;
	return requiredBoolean(row, column);
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

function requiredStringArray(row: PageRow, column: string): string[] {
	const value = row[column];
	if (
		!Array.isArray(value) ||
		!value.every((item) => typeof item === "string")
	) {
		throw new Error(`Invalid text array source column: ${column}`);
	}
	return [...value];
}

/**
 * PostgreSQLのARCHIVE + pi Tipitaka部分だけを一貫したSourceSnapshotへ読み込む。
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
		accountResult,
		sessionResult,
		verificationResult,
		geminiApiKeyResult,
		personalAccessTokenResult,
		importRunResult,
		importFileResult,
		likePageResult,
		notificationResult,
		segmentTypeResult,
		pageLocaleTranslationProofResult,
		segmentMetadataTypeResult,
		tagResult,
		translationContextResult,
		pageViewResult,
		segmentMetadataResult,
		userSettingsResult,
		tagPageResult,
		voteResult,
		linkResult,
	] = await Promise.all([
		client.query<PageRow>(PAGE_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(SEGMENT_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(TRANSLATION_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(TRANSLATION_JOB_ROWS_QUERY, [rootSlug]),
		client.query<PageRow>(USER_ROWS_QUERY),
		client.query<PageRow>(ACCOUNT_ROWS_QUERY),
		client.query<PageRow>(SESSION_ROWS_QUERY),
		client.query<PageRow>(VERIFICATION_ROWS_QUERY),
		client.query<PageRow>(GEMINI_API_KEY_ROWS_QUERY),
		client.query<PageRow>(PERSONAL_ACCESS_TOKEN_ROWS_QUERY),
		client.query<PageRow>(IMPORT_RUN_ROWS_QUERY),
		client.query<PageRow>(IMPORT_FILE_ROWS_QUERY),
		client.query<PageRow>(LIKE_PAGE_ROWS_QUERY),
		client.query<PageRow>(NOTIFICATION_ROWS_QUERY),
		client.query<PageRow>(SEGMENT_TYPE_ROWS_QUERY),
		client.query<PageRow>(PAGE_LOCALE_TRANSLATION_PROOF_ROWS_QUERY),
		client.query<PageRow>(SEGMENT_METADATA_TYPE_ROWS_QUERY),
		client.query<PageRow>(TAG_ROWS_QUERY),
		client.query<PageRow>(TRANSLATION_CONTEXT_ROWS_QUERY),
		client.query<PageRow>(PAGE_VIEW_ROWS_QUERY),
		client.query<PageRow>(SEGMENT_METADATA_ROWS_QUERY),
		client.query<PageRow>(USER_SETTINGS_ROWS_QUERY),
		client.query<PageRow>(TAG_PAGE_ROWS_QUERY),
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
		importFileId: optionalNumber(row, "import_file_id"),
		parentId: optionalNumber(row, "parent_id"),
		position: requiredNumber(row, "position"),
		status: requiredString(row, "status"),
		publishedAt: optionalTimestamp(row, "published_at"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const segments = segmentResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		contentId: requiredNumber(row, "content_id"),
		segmentTypeId: requiredNumber(row, "segment_type_id"),
		position: requiredNumber(row, "position"),
		kind: requiredString(row, "kind"),
		sourceText: requiredString(row, "source_text"),
		textAndOccurrenceHash: requiredString(row, "text_and_occurrence_hash"),
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
		translationContext: requiredString(row, "translation_context"),
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
		handle: requiredString(row, "handle"),
		profile: requiredString(row, "profile"),
		totalPoints: requiredNumber(row, "total_points"),
		isAi: requiredBoolean(row, "is_ai"),
		image: requiredString(row, "image"),
		plan: requiredString(row, "plan"),
		provider: requiredString(row, "provider"),
		twitterHandle: requiredString(row, "twitter_handle"),
		emailVerified: optionalBoolean(row, "email_verified"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const accounts = accountResult.rows.map((row) => ({
		id: requiredString(row, "id"),
		userId: requiredString(row, "user_id"),
		providerId: requiredString(row, "provider_id"),
		accountId: requiredString(row, "account_id"),
		refreshToken: optionalString(row, "refresh_token"),
		accessToken: optionalString(row, "access_token"),
		scope: optionalString(row, "scope"),
		idToken: optionalString(row, "id_token"),
		password: optionalString(row, "password"),
		refreshTokenExpiresAt: optionalTimestamp(row, "refresh_token_expires_at"),
		accessTokenExpiresAt: optionalTimestamp(row, "access_token_expires_at"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const sessions = sessionResult.rows.map((row) => ({
		id: requiredString(row, "id"),
		token: requiredString(row, "token"),
		userId: requiredString(row, "user_id"),
		expiresAt: requiredTimestamp(row, "expires_at"),
		ipAddress: optionalString(row, "ip_address"),
		userAgent: optionalString(row, "user_agent"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const verifications = verificationResult.rows.map((row) => ({
		id: requiredString(row, "id"),
		identifier: requiredString(row, "identifier"),
		value: requiredString(row, "value"),
		expiresAt: requiredTimestamp(row, "expires_at"),
		createdAt: optionalTimestamp(row, "created_at"),
		updatedAt: optionalTimestamp(row, "updated_at"),
	}));

	const geminiApiKeys = geminiApiKeyResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		userId: requiredString(row, "user_id"),
		apiKey: requiredString(row, "api_key"),
	}));

	const personalAccessTokens = personalAccessTokenResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		keyHash: requiredString(row, "key_hash"),
		userId: requiredString(row, "user_id"),
		name: requiredString(row, "name"),
		createdAt: requiredTimestamp(row, "created_at"),
		lastUsedAt: optionalTimestamp(row, "last_used_at"),
	}));

	const importRuns = importRunResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		startedAt: requiredTimestamp(row, "started_at"),
		finishedAt: optionalTimestamp(row, "finished_at"),
		status: requiredString(row, "status"),
	}));

	const importFiles = importFileResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		importRunId: requiredNumber(row, "import_run_id"),
		path: requiredString(row, "path"),
		checksum: requiredString(row, "checksum"),
		status: requiredString(row, "status"),
		message: requiredString(row, "message"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const likePages = likePageResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		pageId: requiredNumber(row, "page_id"),
		createdAt: requiredTimestamp(row, "created_at"),
		userId: optionalString(row, "user_id"),
	}));

	const notifications = notificationResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		userId: requiredString(row, "user_id"),
		type: requiredString(row, "type"),
		read: requiredBoolean(row, "read"),
		createdAt: requiredTimestamp(row, "created_at"),
		actorId: requiredString(row, "actor_id"),
		pageCommentId: optionalNumber(row, "page_comment_id"),
		pageId: optionalNumber(row, "page_id"),
		segmentTranslationId: optionalNumber(row, "segment_translation_id"),
	}));

	const segmentTypes = segmentTypeResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		label: requiredString(row, "label"),
		key: requiredString(row, "key"),
	}));

	const pageLocaleTranslationProofs = pageLocaleTranslationProofResult.rows.map(
		(row) => ({
			id: requiredNumber(row, "id"),
			pageId: requiredNumber(row, "page_id"),
			locale: requiredString(row, "locale"),
			translationProofStatus: requiredString(row, "translation_proof_status"),
		}),
	);

	const segmentMetadataTypes = segmentMetadataTypeResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		key: requiredString(row, "key"),
		label: requiredString(row, "label"),
	}));

	const tags = tagResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		name: requiredString(row, "name"),
	}));

	const translationContexts = translationContextResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		userId: requiredString(row, "user_id"),
		name: requiredString(row, "name"),
		context: requiredString(row, "context"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const pageViews = pageViewResult.rows.map((row) => ({
		pageId: requiredNumber(row, "page_id"),
		count: requiredNumber(row, "count"),
	}));

	const segmentMetadata = segmentMetadataResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		segmentId: requiredNumber(row, "segment_id"),
		metadataTypeId: requiredNumber(row, "metadata_type_id"),
		value: requiredString(row, "value"),
		createdAt: requiredTimestamp(row, "created_at"),
	}));

	const userSettings = userSettingsResult.rows.map((row) => ({
		id: requiredNumber(row, "id"),
		userId: requiredString(row, "user_id"),
		targetLocales: requiredStringArray(row, "target_locales"),
		createdAt: requiredTimestamp(row, "created_at"),
		updatedAt: requiredTimestamp(row, "updated_at"),
	}));

	const tagPages = tagPageResult.rows.map((row) => ({
		tagId: requiredNumber(row, "tag_id"),
		pageId: requiredNumber(row, "page_id"),
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
		accounts,
		sessions,
		verifications,
		geminiApiKeys,
		personalAccessTokens,
		importRuns,
		importFiles,
		likePages,
		notifications,
		segmentTypes,
		pageLocaleTranslationProofs,
		segmentMetadataTypes,
		tags,
		translationContexts,
		pageViews,
		segmentMetadata,
		userSettings,
		tagPages,
		votes,
		annotationLinks,
	};
}

export interface PostgresSource {
	load(rootSlug?: string): Promise<SourceSnapshot>;
	close(): Promise<void>;
}

/**
 * 本番sourceの固定queryが参照する列をinformation_schemaで照合する。
 * この検査は列名だけを扱い、データ値・接続情報・秘密値を出力しない。
 */
export async function preflightSourceSchema(
	client: PostgresQueryClient,
): Promise<void> {
	const tableNames = Object.keys(sourceSchemaRequirements);
	const result = await client.query<PageRow>(SOURCE_SCHEMA_PREFLIGHT_QUERY, [
		tableNames,
	]);
	const available = new Set(
		result.rows.map(
			(row) =>
				`${requiredString(row, "table_name")}\u0000${requiredString(row, "column_name")}`,
		),
	);
	const missing = Object.entries(sourceSchemaRequirements).flatMap(
		([tableName, columnNames]) =>
			columnNames
				.filter(
					(columnName) => !available.has(`${tableName}\u0000${columnName}`),
				)
				.map((columnName) => `${tableName}.${columnName}`),
	);
	if (missing.length > 0) {
		throw new Error(
			`Source schema preflight failed; missing required columns: ${missing.join(", ")}`,
		);
	}
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
	let schemaPreflightPassed = false;
	return {
		load: async (rootSlug = "tipitaka") => {
			if (!schemaPreflightPassed) {
				await preflightSourceSchema(pool);
				schemaPreflightPassed = true;
			}
			return loadSourceSnapshot(pool, rootSlug);
		},
		close: () => pool.end(),
	};
}

export const sourceQueries = {
	page: PAGE_ROWS_QUERY,
	segment: SEGMENT_ROWS_QUERY,
	translation: TRANSLATION_ROWS_QUERY,
	translationJob: TRANSLATION_JOB_ROWS_QUERY,
	user: USER_ROWS_QUERY,
	account: ACCOUNT_ROWS_QUERY,
	session: SESSION_ROWS_QUERY,
	verification: VERIFICATION_ROWS_QUERY,
	geminiApiKey: GEMINI_API_KEY_ROWS_QUERY,
	personalAccessToken: PERSONAL_ACCESS_TOKEN_ROWS_QUERY,
	importRun: IMPORT_RUN_ROWS_QUERY,
	importFile: IMPORT_FILE_ROWS_QUERY,
	likePage: LIKE_PAGE_ROWS_QUERY,
	notification: NOTIFICATION_ROWS_QUERY,
	segmentType: SEGMENT_TYPE_ROWS_QUERY,
	pageLocaleTranslationProof: PAGE_LOCALE_TRANSLATION_PROOF_ROWS_QUERY,
	segmentMetadataType: SEGMENT_METADATA_TYPE_ROWS_QUERY,
	tag: TAG_ROWS_QUERY,
	translationContext: TRANSLATION_CONTEXT_ROWS_QUERY,
	pageView: PAGE_VIEW_ROWS_QUERY,
	segmentMetadata: SEGMENT_METADATA_ROWS_QUERY,
	userSettings: USER_SETTINGS_ROWS_QUERY,
	tagPage: TAG_PAGE_ROWS_QUERY,
	schemaPreflight: SOURCE_SCHEMA_PREFLIGHT_QUERY,
	vote: VOTE_ROWS_QUERY,
	annotationLink: ANNOTATION_LINK_ROWS_QUERY,
} as const;
