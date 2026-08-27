import type { Connection } from "@tursodatabase/serverless";
import type {
	MigrationCounts,
	MigrationPlan,
	TargetAccount,
	TargetAnnotationLink,
	TargetGeminiApiKey,
	TargetImportFile,
	TargetImportRun,
	TargetLikePage,
	TargetNotification,
	TargetPageLocaleTranslationProof,
	TargetPageView,
	TargetPersonalAccessToken,
	TargetScripture,
	TargetSegment,
	TargetSegmentMetadata,
	TargetSegmentMetadataType,
	TargetSegmentType,
	TargetSession,
	TargetTag,
	TargetTagPage,
	TargetTranslation,
	TargetTranslationContext,
	TargetTranslationJob,
	TargetTranslationVote,
	TargetUser,
	TargetUserSettings,
	TargetVerification,
} from "./types";

export type SqlValue = string | number | boolean | null;

export interface TursoStatement {
	sql: string;
	args: SqlValue[];
}

export interface TursoResult {
	rows: readonly Record<string, unknown>[];
}

export interface TursoConnection {
	batch(
		statements: readonly TursoStatement[],
		mode?: "write" | "read" | "deferred",
	): Promise<unknown>;
	all(sql: string, args?: SqlValue[]): Promise<TursoResult>;
	close?(): Promise<void>;
}

const UPSERT_USERS_SQL = `
INSERT INTO users
  (id, email, name, handle, profile, total_points, is_ai, image, plan,
   provider, twitter_handle, email_verified, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  handle = excluded.handle,
  profile = excluded.profile,
  total_points = excluded.total_points,
  is_ai = excluded.is_ai,
  image = excluded.image,
  plan = excluded.plan,
  provider = excluded.provider,
  twitter_handle = excluded.twitter_handle,
  email_verified = excluded.email_verified,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_ACCOUNTS_SQL = `
INSERT INTO accounts
  (id, user_id, provider_id, account_id, refresh_token, access_token, scope,
   id_token, password, refresh_token_expires_at, access_token_expires_at,
   created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  user_id = excluded.user_id,
  provider_id = excluded.provider_id,
  account_id = excluded.account_id,
  refresh_token = excluded.refresh_token,
  access_token = excluded.access_token,
  scope = excluded.scope,
  id_token = excluded.id_token,
  password = excluded.password,
  refresh_token_expires_at = excluded.refresh_token_expires_at,
  access_token_expires_at = excluded.access_token_expires_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_SESSIONS_SQL = `
INSERT INTO sessions
  (id, token, user_id, expires_at, ip_address, user_agent, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  token = excluded.token,
  user_id = excluded.user_id,
  expires_at = excluded.expires_at,
  ip_address = excluded.ip_address,
  user_agent = excluded.user_agent,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_VERIFICATIONS_SQL = `
INSERT INTO verifications
  (id, identifier, value, expires_at, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  identifier = excluded.identifier,
  value = excluded.value,
  expires_at = excluded.expires_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_GEMINI_API_KEYS_SQL = `
INSERT INTO gemini_api_keys (id, user_id, api_key)
VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  user_id = excluded.user_id,
  api_key = excluded.api_key
`;

const UPSERT_PERSONAL_ACCESS_TOKENS_SQL = `
INSERT INTO personal_access_tokens
  (id, key_hash, user_id, name, created_at, last_used_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  key_hash = excluded.key_hash,
  user_id = excluded.user_id,
  name = excluded.name,
  created_at = excluded.created_at,
  last_used_at = excluded.last_used_at
`;

const UPSERT_IMPORT_RUNS_SQL = `
INSERT INTO import_runs (id, started_at, finished_at, status)
VALUES (?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  status = excluded.status
`;

const UPSERT_IMPORT_FILES_SQL = `
INSERT INTO import_files
  (id, import_run_id, path, checksum, status, message, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  import_run_id = excluded.import_run_id,
  path = excluded.path,
  checksum = excluded.checksum,
  status = excluded.status,
  message = excluded.message,
  created_at = excluded.created_at
`;

const UPSERT_SCRIPTURES_SQL = `
INSERT INTO scriptures
  (id, slug, title, source_locale, owner_user_id, import_file_id, parent_id,
   position, published_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  slug = excluded.slug,
  title = excluded.title,
  source_locale = excluded.source_locale,
  owner_user_id = excluded.owner_user_id,
  import_file_id = excluded.import_file_id,
  parent_id = excluded.parent_id,
  position = excluded.position,
  published_at = excluded.published_at
`;

const UPSERT_SEGMENTS_SQL = `
INSERT INTO segments
  (id, scripture_id, segment_type_id, kind, position, source_text,
   text_and_occurrence_hash, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  scripture_id = excluded.scripture_id,
  segment_type_id = excluded.segment_type_id,
  kind = excluded.kind,
  position = excluded.position,
  source_text = excluded.source_text,
  text_and_occurrence_hash = excluded.text_and_occurrence_hash,
  created_at = excluded.created_at
`;

const UPSERT_LIKE_PAGES_SQL = `
INSERT INTO like_pages (id, page_id, created_at, user_id)
VALUES (?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  page_id = excluded.page_id,
  created_at = excluded.created_at,
  user_id = excluded.user_id
`;

const UPSERT_NOTIFICATIONS_SQL = `
INSERT INTO notifications
  (id, user_id, type, read, created_at, actor_id, page_comment_id, page_id,
   segment_translation_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  user_id = excluded.user_id,
  type = excluded.type,
  read = excluded.read,
  created_at = excluded.created_at,
  actor_id = excluded.actor_id,
  page_comment_id = excluded.page_comment_id,
  page_id = excluded.page_id,
  segment_translation_id = excluded.segment_translation_id
`;

const UPSERT_SEGMENT_TYPES_SQL = `
INSERT INTO segment_types (id, label, key)
VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  label = excluded.label,
  key = excluded.key
`;

const UPSERT_PAGE_LOCALE_TRANSLATION_PROOFS_SQL = `
INSERT INTO page_locale_translation_proofs
  (id, page_id, locale, translation_proof_status)
VALUES (?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  page_id = excluded.page_id,
  locale = excluded.locale,
  translation_proof_status = excluded.translation_proof_status
`;

const UPSERT_SEGMENT_METADATA_TYPES_SQL = `
INSERT INTO segment_metadata_types (id, key, label)
VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  key = excluded.key,
  label = excluded.label
`;

const UPSERT_TAGS_SQL = `
INSERT INTO tags (id, name)
VALUES (?, ?)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name
`;

const UPSERT_TRANSLATION_CONTEXTS_SQL = `
INSERT INTO translation_contexts
  (id, user_id, name, context, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  user_id = excluded.user_id,
  name = excluded.name,
  context = excluded.context,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_PAGE_VIEWS_SQL = `
INSERT INTO page_views (page_id, count)
VALUES (?, ?)
ON CONFLICT (page_id) DO UPDATE SET
  count = excluded.count
`;

const UPSERT_SEGMENT_METADATA_SQL = `
INSERT INTO segment_metadata
  (id, segment_id, metadata_type_id, value, created_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  segment_id = excluded.segment_id,
  metadata_type_id = excluded.metadata_type_id,
  value = excluded.value,
  created_at = excluded.created_at
`;

const UPSERT_USER_SETTINGS_SQL = `
INSERT INTO user_settings
  (id, user_id, target_locales, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  user_id = excluded.user_id,
  target_locales = excluded.target_locales,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_TAG_PAGES_SQL = `
INSERT INTO tag_pages (tag_id, page_id)
VALUES (?, ?)
ON CONFLICT (tag_id, page_id) DO UPDATE SET
  page_id = excluded.page_id
`;

const UPSERT_TRANSLATION_JOBS_SQL = `
INSERT INTO translation_jobs
  (id, scripture_id, locale, model, status, progress, total, error,
   requested_by, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  scripture_id = excluded.scripture_id,
  locale = excluded.locale,
  model = excluded.model,
  status = excluded.status,
  progress = excluded.progress,
  total = excluded.total,
  error = excluded.error,
  requested_by = excluded.requested_by,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_TRANSLATIONS_SQL = `
INSERT INTO translations
  (id, segment_id, locale, text, point, user_id, source, ai_job_id,
   created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  segment_id = excluded.segment_id,
  locale = excluded.locale,
  text = excluded.text,
  point = excluded.point,
  user_id = excluded.user_id,
  source = excluded.source,
  ai_job_id = excluded.ai_job_id,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_VOTES_SQL = `
INSERT INTO translation_votes
  (translation_id, user_id, is_upvote, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (translation_id, user_id) DO UPDATE SET
  is_upvote = excluded.is_upvote,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at
`;

const UPSERT_ANNOTATION_LINKS_SQL = `
INSERT INTO segment_annotation_links
  (main_segment_id, annotation_segment_id, created_at)
VALUES (?, ?, ?)
ON CONFLICT (main_segment_id, annotation_segment_id) DO UPDATE SET
  created_at = excluded.created_at
`;

function statement(sql: string, args: SqlValue[]): TursoStatement {
	return { sql, args };
}

function userStatement(row: TargetUser): TursoStatement {
	return statement(UPSERT_USERS_SQL, [
		row.id,
		row.email,
		row.name,
		row.handle,
		row.profile,
		row.totalPoints,
		row.isAi,
		row.image,
		row.plan,
		row.provider,
		row.twitterHandle,
		row.emailVerified,
		row.createdAt,
		row.updatedAt,
	]);
}

function accountStatement(row: TargetAccount): TursoStatement {
	return statement(UPSERT_ACCOUNTS_SQL, [
		row.id,
		row.userId,
		row.providerId,
		row.accountId,
		row.refreshToken,
		row.accessToken,
		row.scope,
		row.idToken,
		row.password,
		row.refreshTokenExpiresAt,
		row.accessTokenExpiresAt,
		row.createdAt,
		row.updatedAt,
	]);
}

function sessionStatement(row: TargetSession): TursoStatement {
	return statement(UPSERT_SESSIONS_SQL, [
		row.id,
		row.token,
		row.userId,
		row.expiresAt,
		row.ipAddress,
		row.userAgent,
		row.createdAt,
		row.updatedAt,
	]);
}

function verificationStatement(row: TargetVerification): TursoStatement {
	return statement(UPSERT_VERIFICATIONS_SQL, [
		row.id,
		row.identifier,
		row.value,
		row.expiresAt,
		row.createdAt,
		row.updatedAt,
	]);
}

function geminiApiKeyStatement(row: TargetGeminiApiKey): TursoStatement {
	return statement(UPSERT_GEMINI_API_KEYS_SQL, [
		row.id,
		row.userId,
		row.apiKey,
	]);
}

function personalAccessTokenStatement(
	row: TargetPersonalAccessToken,
): TursoStatement {
	return statement(UPSERT_PERSONAL_ACCESS_TOKENS_SQL, [
		row.id,
		row.keyHash,
		row.userId,
		row.name,
		row.createdAt,
		row.lastUsedAt,
	]);
}

function importRunStatement(row: TargetImportRun): TursoStatement {
	return statement(UPSERT_IMPORT_RUNS_SQL, [
		row.id,
		row.startedAt,
		row.finishedAt,
		row.status,
	]);
}

function importFileStatement(row: TargetImportFile): TursoStatement {
	return statement(UPSERT_IMPORT_FILES_SQL, [
		row.id,
		row.importRunId,
		row.path,
		row.checksum,
		row.status,
		row.message,
		row.createdAt,
	]);
}

function scriptureStatement(row: TargetScripture): TursoStatement {
	return statement(UPSERT_SCRIPTURES_SQL, [
		row.id,
		row.slug,
		row.title,
		row.sourceLocale,
		row.ownerUserId,
		row.importFileId,
		row.parentId,
		row.position,
		row.publishedAt,
	]);
}

function segmentStatement(row: TargetSegment): TursoStatement {
	return statement(UPSERT_SEGMENTS_SQL, [
		row.id,
		row.scriptureId,
		row.segmentTypeId,
		row.kind,
		row.position,
		row.sourceText,
		row.textAndOccurrenceHash,
		row.createdAt,
	]);
}

function likePageStatement(row: TargetLikePage): TursoStatement {
	return statement(UPSERT_LIKE_PAGES_SQL, [
		row.id,
		row.pageId,
		row.createdAt,
		row.userId,
	]);
}

function notificationStatement(row: TargetNotification): TursoStatement {
	return statement(UPSERT_NOTIFICATIONS_SQL, [
		row.id,
		row.userId,
		row.type,
		row.read,
		row.createdAt,
		row.actorId,
		row.pageCommentId,
		row.pageId,
		row.segmentTranslationId,
	]);
}

function segmentTypeStatement(row: TargetSegmentType): TursoStatement {
	return statement(UPSERT_SEGMENT_TYPES_SQL, [row.id, row.label, row.key]);
}

function pageLocaleTranslationProofStatement(
	row: TargetPageLocaleTranslationProof,
): TursoStatement {
	return statement(UPSERT_PAGE_LOCALE_TRANSLATION_PROOFS_SQL, [
		row.id,
		row.pageId,
		row.locale,
		row.translationProofStatus,
	]);
}

function segmentMetadataTypeStatement(
	row: TargetSegmentMetadataType,
): TursoStatement {
	return statement(UPSERT_SEGMENT_METADATA_TYPES_SQL, [
		row.id,
		row.key,
		row.label,
	]);
}

function tagStatement(row: TargetTag): TursoStatement {
	return statement(UPSERT_TAGS_SQL, [row.id, row.name]);
}

function translationContextStatement(
	row: TargetTranslationContext,
): TursoStatement {
	return statement(UPSERT_TRANSLATION_CONTEXTS_SQL, [
		row.id,
		row.userId,
		row.name,
		row.context,
		row.createdAt,
		row.updatedAt,
	]);
}

function pageViewStatement(row: TargetPageView): TursoStatement {
	return statement(UPSERT_PAGE_VIEWS_SQL, [row.pageId, row.count]);
}

function segmentMetadataStatement(row: TargetSegmentMetadata): TursoStatement {
	return statement(UPSERT_SEGMENT_METADATA_SQL, [
		row.id,
		row.segmentId,
		row.metadataTypeId,
		row.value,
		row.createdAt,
	]);
}

function userSettingsStatement(row: TargetUserSettings): TursoStatement {
	return statement(UPSERT_USER_SETTINGS_SQL, [
		row.id,
		row.userId,
		row.targetLocales,
		row.createdAt,
		row.updatedAt,
	]);
}

function tagPageStatement(row: TargetTagPage): TursoStatement {
	return statement(UPSERT_TAG_PAGES_SQL, [row.tagId, row.pageId]);
}

function translationJobStatement(row: TargetTranslationJob): TursoStatement {
	return statement(UPSERT_TRANSLATION_JOBS_SQL, [
		row.id,
		row.scriptureId,
		row.locale,
		row.model,
		row.status,
		row.progress,
		row.total,
		row.error,
		row.requestedBy,
		row.createdAt,
		row.updatedAt,
	]);
}

function translationStatement(row: TargetTranslation): TursoStatement {
	return statement(UPSERT_TRANSLATIONS_SQL, [
		row.id,
		row.segmentId,
		row.locale,
		row.text,
		row.point,
		row.userId,
		row.source,
		row.aiJobId,
		row.createdAt,
		row.updatedAt,
	]);
}

function voteStatement(row: TargetTranslationVote): TursoStatement {
	return statement(UPSERT_VOTES_SQL, [
		row.translationId,
		row.userId,
		row.isUpvote,
		row.createdAt,
		row.updatedAt,
	]);
}

function annotationLinkStatement(row: TargetAnnotationLink): TursoStatement {
	return statement(UPSERT_ANNOTATION_LINKS_SQL, [
		row.mainSegmentId,
		row.annotationSegmentId,
		row.createdAt,
	]);
}

/**
 * 計画を外部接続なしのparameterized upsert文へ変換する。
 * 行順は外部キーの依存順に固定し、同じ計画を何度適用しても更新になる。
 */
export function buildUpsertStatements(plan: MigrationPlan): TursoStatement[] {
	return [
		...plan.users.map(userStatement),
		...plan.accounts.map(accountStatement),
		...plan.sessions.map(sessionStatement),
		...plan.verifications.map(verificationStatement),
		...plan.geminiApiKeys.map(geminiApiKeyStatement),
		...plan.personalAccessTokens.map(personalAccessTokenStatement),
		...plan.translationContexts.map(translationContextStatement),
		...plan.userSettings.map(userSettingsStatement),
		...plan.importRuns.map(importRunStatement),
		...plan.importFiles.map(importFileStatement),
		...plan.segmentTypes.map(segmentTypeStatement),
		...plan.segmentMetadataTypes.map(segmentMetadataTypeStatement),
		...plan.tags.map(tagStatement),
		...plan.scriptures.map(scriptureStatement),
		...plan.segments.map(segmentStatement),
		...plan.pageLocaleTranslationProofs.map(
			pageLocaleTranslationProofStatement,
		),
		...plan.pageViews.map(pageViewStatement),
		...plan.likePages.map(likePageStatement),
		...plan.tagPages.map(tagPageStatement),
		...plan.segmentMetadata.map(segmentMetadataStatement),
		...plan.translationJobs.map(translationJobStatement),
		...plan.translations.map(translationStatement),
		...plan.translationVotes.map(voteStatement),
		...plan.annotationLinks.map(annotationLinkStatement),
		...plan.notifications.map(notificationStatement),
	];
}

export function chunkStatements(
	statements: TursoStatement[],
	chunkSize: number,
): TursoStatement[][] {
	if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
		throw new Error("Turso batch size must be a positive integer");
	}
	const chunks: TursoStatement[][] = [];
	for (let index = 0; index < statements.length; index += chunkSize) {
		chunks.push(statements.slice(index, index + chunkSize));
	}
	return chunks;
}

export async function applyMigrationPlan(
	target: TursoConnection,
	plan: MigrationPlan,
	options: { batchSize?: number } = {},
): Promise<void> {
	const statements = buildUpsertStatements(plan);
	const chunks = chunkStatements(statements, options.batchSize ?? 100);
	for (const chunk of chunks) {
		await target.batch(chunk, "write");
	}
}

function countFromResult(result: TursoResult): number {
	const value = result.rows[0]?.count;
	const count = typeof value === "number" ? value : Number(value);
	if (!Number.isSafeInteger(count) || count < 0) {
		throw new Error("Invalid count returned by Turso");
	}
	return count;
}

async function countByValues(
	target: TursoConnection,
	table: string,
	column: string,
	values: readonly SqlValue[],
): Promise<number> {
	if (values.length === 0) return 0;
	let count = 0;
	for (let index = 0; index < values.length; index += 400) {
		const chunk = values.slice(index, index + 400);
		const placeholders = chunk.map(() => "?").join(", ");
		const result = await target.all(
			`SELECT COUNT(*) AS count FROM ${table} WHERE ${column} IN (${placeholders})`,
			[...chunk],
		);
		count += countFromResult(result);
	}
	return count;
}

async function countByPairs(
	target: TursoConnection,
	table: string,
	firstColumn: string,
	secondColumn: string,
	pairs: readonly [SqlValue, SqlValue][],
): Promise<number> {
	if (pairs.length === 0) return 0;
	let count = 0;
	for (let index = 0; index < pairs.length; index += 50) {
		const chunk = pairs.slice(index, index + 50);
		const predicates = chunk
			.map(() => `(${firstColumn} = ? AND ${secondColumn} = ?)`)
			.join(" OR ");
		const args = chunk.flat();
		const result = await target.all(
			`SELECT COUNT(*) AS count FROM ${table} WHERE ${predicates}`,
			args,
		);
		count += countFromResult(result);
	}
	return count;
}

async function countRows(
	target: TursoConnection,
	plan: MigrationPlan,
): Promise<MigrationCounts> {
	const [
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
		scriptures,
		segments,
		translations,
		translationJobs,
	] = await Promise.all([
		countByValues(
			target,
			"users",
			"id",
			plan.users.map((row) => row.id),
		),
		countByValues(
			target,
			"accounts",
			"id",
			plan.accounts.map((row) => row.id),
		),
		countByValues(
			target,
			"sessions",
			"id",
			plan.sessions.map((row) => row.id),
		),
		countByValues(
			target,
			"verifications",
			"id",
			plan.verifications.map((row) => row.id),
		),
		countByValues(
			target,
			"gemini_api_keys",
			"id",
			plan.geminiApiKeys.map((row) => row.id),
		),
		countByValues(
			target,
			"personal_access_tokens",
			"id",
			plan.personalAccessTokens.map((row) => row.id),
		),
		countByValues(
			target,
			"import_runs",
			"id",
			plan.importRuns.map((row) => row.id),
		),
		countByValues(
			target,
			"import_files",
			"id",
			plan.importFiles.map((row) => row.id),
		),
		countByValues(
			target,
			"like_pages",
			"id",
			plan.likePages.map((row) => row.id),
		),
		countByValues(
			target,
			"notifications",
			"id",
			plan.notifications.map((row) => row.id),
		),
		countByValues(
			target,
			"segment_types",
			"id",
			plan.segmentTypes.map((row) => row.id),
		),
		countByValues(
			target,
			"page_locale_translation_proofs",
			"id",
			plan.pageLocaleTranslationProofs.map((row) => row.id),
		),
		countByValues(
			target,
			"segment_metadata_types",
			"id",
			plan.segmentMetadataTypes.map((row) => row.id),
		),
		countByValues(
			target,
			"tags",
			"id",
			plan.tags.map((row) => row.id),
		),
		countByValues(
			target,
			"translation_contexts",
			"id",
			plan.translationContexts.map((row) => row.id),
		),
		countByValues(
			target,
			"page_views",
			"page_id",
			plan.pageViews.map((row) => row.pageId),
		),
		countByValues(
			target,
			"segment_metadata",
			"id",
			plan.segmentMetadata.map((row) => row.id),
		),
		countByValues(
			target,
			"user_settings",
			"id",
			plan.userSettings.map((row) => row.id),
		),
		countByValues(
			target,
			"scriptures",
			"id",
			plan.scriptures.map((row) => row.id),
		),
		countByValues(
			target,
			"segments",
			"id",
			plan.segments.map((row) => row.id),
		),
		countByValues(
			target,
			"translations",
			"id",
			plan.translations.map((row) => row.id),
		),
		countByValues(
			target,
			"translation_jobs",
			"id",
			plan.translationJobs.map((row) => row.id),
		),
	]);
	const translationVotes = await countByPairs(
		target,
		"translation_votes",
		"translation_id",
		"user_id",
		plan.translationVotes.map((row) => [row.translationId, row.userId]),
	);
	const annotationLinks = await countByPairs(
		target,
		"segment_annotation_links",
		"main_segment_id",
		"annotation_segment_id",
		plan.annotationLinks.map((row) => [
			row.mainSegmentId,
			row.annotationSegmentId,
		]),
	);
	const tagPages = await countByPairs(
		target,
		"tag_pages",
		"tag_id",
		"page_id",
		plan.tagPages.map((row) => [row.tagId, row.pageId]),
	);
	return {
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
		scriptures,
		segments,
		translations,
		translationJobs,
		translationVotes,
		annotationLinks,
	};
}

export async function verifyMigrationCounts(
	target: TursoConnection,
	plan: MigrationPlan,
): Promise<MigrationCounts> {
	const actual = await countRows(target, plan);
	for (const key of Object.keys(plan.report.counts) as Array<
		keyof MigrationCounts
	>) {
		const expected = plan.report.counts[key];
		if (actual[key] !== expected) {
			throw new Error(
				`Migration count mismatch for ${key}: expected ${expected}, got ${actual[key]}`,
			);
		}
	}
	return actual;
}

type TursoSdkConnection = Pick<Connection, "all" | "batch" | "close">;

/**
 * 公式Connectionの読み取り結果を、移行側の件数照合形式へ変換する。
 * `execute`や互換APIに依存せず、serverless Connectionの正規APIだけを使う。
 */
export function adaptTursoConnection(
	connection: TursoSdkConnection,
): TursoConnection {
	return {
		batch: (statements, mode) =>
			connection.batch(
				statements.map(({ sql, args }) => ({ sql, args })),
				mode,
			),
		all: async (sql, args) => ({
			rows:
				args === undefined
					? await connection.all(sql)
					: await connection.all(sql, args),
		}),
		close: () => connection.close(),
	};
}

/**
 * リモートTurso接続をCLI境界でだけ生成する。
 * SDKはfetchだけを使う`@tursodatabase/serverless`に固定し、秘密値は返さない。
 */
export async function createTursoTarget(
	url = process.env.TURSO_DATABASE_URL,
	authToken = process.env.TURSO_AUTH_TOKEN,
): Promise<TursoConnection> {
	if (!url) throw new Error("TURSO_DATABASE_URL is required");
	if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required");
	const { connect } = await import("@tursodatabase/serverless");
	return adaptTursoConnection(connect({ url, authToken }));
}

export const targetSql = {
	users: UPSERT_USERS_SQL,
	accounts: UPSERT_ACCOUNTS_SQL,
	sessions: UPSERT_SESSIONS_SQL,
	verifications: UPSERT_VERIFICATIONS_SQL,
	geminiApiKeys: UPSERT_GEMINI_API_KEYS_SQL,
	personalAccessTokens: UPSERT_PERSONAL_ACCESS_TOKENS_SQL,
	importRuns: UPSERT_IMPORT_RUNS_SQL,
	importFiles: UPSERT_IMPORT_FILES_SQL,
	scriptures: UPSERT_SCRIPTURES_SQL,
	segments: UPSERT_SEGMENTS_SQL,
	likePages: UPSERT_LIKE_PAGES_SQL,
	notifications: UPSERT_NOTIFICATIONS_SQL,
	segmentTypes: UPSERT_SEGMENT_TYPES_SQL,
	pageLocaleTranslationProofs: UPSERT_PAGE_LOCALE_TRANSLATION_PROOFS_SQL,
	segmentMetadataTypes: UPSERT_SEGMENT_METADATA_TYPES_SQL,
	tags: UPSERT_TAGS_SQL,
	translationContexts: UPSERT_TRANSLATION_CONTEXTS_SQL,
	pageViews: UPSERT_PAGE_VIEWS_SQL,
	segmentMetadata: UPSERT_SEGMENT_METADATA_SQL,
	userSettings: UPSERT_USER_SETTINGS_SQL,
	tagPages: UPSERT_TAG_PAGES_SQL,
	translationJobs: UPSERT_TRANSLATION_JOBS_SQL,
	translations: UPSERT_TRANSLATIONS_SQL,
	translationVotes: UPSERT_VOTES_SQL,
	annotationLinks: UPSERT_ANNOTATION_LINKS_SQL,
} as const;
