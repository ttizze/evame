import type { Connection } from "@tursodatabase/serverless";
import type {
	MigrationCounts,
	MigrationPlan,
	TargetAnnotationLink,
	TargetScripture,
	TargetSegment,
	TargetTranslation,
	TargetTranslationJob,
	TargetTranslationVote,
	TargetUser,
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
INSERT INTO users (id, email, name, created_at)
VALUES (?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  created_at = excluded.created_at
`;

const UPSERT_SCRIPTURES_SQL = `
INSERT INTO scriptures
  (id, slug, title, source_locale, owner_user_id, parent_id, position, published_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  slug = excluded.slug,
  title = excluded.title,
  source_locale = excluded.source_locale,
  owner_user_id = excluded.owner_user_id,
  parent_id = excluded.parent_id,
  position = excluded.position,
  published_at = excluded.published_at
`;

const UPSERT_SEGMENTS_SQL = `
INSERT INTO segments
  (id, scripture_id, kind, position, source_text, created_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  scripture_id = excluded.scripture_id,
  kind = excluded.kind,
  position = excluded.position,
  source_text = excluded.source_text,
  created_at = excluded.created_at
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
		row.parentId,
		row.position,
		row.publishedAt,
	]);
}

function segmentStatement(row: TargetSegment): TursoStatement {
	return statement(UPSERT_SEGMENTS_SQL, [
		row.id,
		row.scriptureId,
		row.kind,
		row.position,
		row.sourceText,
		row.createdAt,
	]);
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
		...plan.scriptures.map(scriptureStatement),
		...plan.segments.map(segmentStatement),
		...plan.translationJobs.map(translationJobStatement),
		...plan.translations.map(translationStatement),
		...plan.translationVotes.map(voteStatement),
		...plan.annotationLinks.map(annotationLinkStatement),
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
	for (let index = 0; index < pairs.length; index += 200) {
		const chunk = pairs.slice(index, index + 200);
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
	const [users, scriptures, segments, translations, translationJobs] =
		await Promise.all([
			countByValues(
				target,
				"users",
				"id",
				plan.users.map((row) => row.id),
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
	return {
		users,
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
	scriptures: UPSERT_SCRIPTURES_SQL,
	segments: UPSERT_SEGMENTS_SQL,
	translationJobs: UPSERT_TRANSLATION_JOBS_SQL,
	translations: UPSERT_TRANSLATIONS_SQL,
	translationVotes: UPSERT_VOTES_SQL,
	annotationLinks: UPSERT_ANNOTATION_LINKS_SQL,
} as const;
