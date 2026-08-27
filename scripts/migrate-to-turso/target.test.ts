import type { Connection } from "@tursodatabase/serverless";
import { describe, expect, it } from "vitest";
import {
	adaptTursoConnection,
	applyMigrationPlan,
	buildUpsertStatements,
	chunkStatements,
	type TursoConnection,
	verifyMigrationCounts,
} from "./target";
import type { MigrationPlan } from "./types";

function makePlan(): MigrationPlan {
	return {
		users: [
			{
				id: "owner-1",
				email: "owner@example.com",
				name: "Owner",
				handle: "owner",
				profile: "Owner profile",
				totalPoints: 10,
				isAi: false,
				image: "https://example.com/owner.png",
				plan: "free",
				provider: "Credentials",
				twitterHandle: "",
				emailVerified: true,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		],
		accounts: [
			{
				id: "account-1",
				userId: "owner-1",
				providerId: "credentials",
				accountId: "owner@example.com",
				refreshToken: "ciphertext-refresh",
				accessToken: null,
				scope: null,
				idToken: null,
				password: null,
				refreshTokenExpiresAt: null,
				accessTokenExpiresAt: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		],
		sessions: [
			{
				id: "session-1",
				token: "session-value",
				userId: "owner-1",
				expiresAt: "2025-02-01T00:00:00.000Z",
				ipAddress: null,
				userAgent: "test-agent",
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-02T00:00:00.000Z",
			},
		],
		verifications: [
			{
				id: "verification-1",
				identifier: "owner@example.com",
				value: "verification-value",
				expiresAt: "2025-02-01T00:00:00.000Z",
				createdAt: null,
				updatedAt: null,
			},
		],
		geminiApiKeys: [
			{
				id: 4,
				userId: "owner-1",
				apiKey: "ciphertext-gemini",
			},
		],
		personalAccessTokens: [],
		importRuns: [],
		importFiles: [],
		likePages: [],
		notifications: [],
		segmentTypes: [],
		pageLocaleTranslationProofs: [],
		segmentMetadataTypes: [],
		tags: [],
		translationContexts: [],
		pageViews: [],
		segmentMetadata: [],
		userSettings: [],
		tagPages: [],
		scriptures: [
			{
				id: 1,
				slug: "tipitaka",
				title: "Tipitaka",
				sourceLocale: "pi",
				ownerUserId: "owner-1",
				importFileId: null,
				parentId: null,
				position: 0,
				publishedAt: null,
			},
		],
		segments: [
			{
				id: 2,
				scriptureId: 1,
				segmentTypeId: 1,
				kind: "PRIMARY",
				position: 0,
				sourceText: "Tipitaka",
				textAndOccurrenceHash: "hash-2",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
		translations: [
			{
				id: 3,
				segmentId: 2,
				locale: "ja",
				text: "三蔵",
				point: 1,
				userId: "owner-1",
				source: "USER",
				aiJobId: null,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		],
		translationJobs: [
			{
				id: "job-1",
				scriptureId: 1,
				locale: "ja",
				model: "model",
				status: "FAILED",
				progress: 0,
				total: 1,
				error: "Migrated incomplete translation job; rerun required.",
				requestedBy: "owner-1",
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		],
		translationVotes: [
			{
				translationId: 3,
				userId: "owner-1",
				isUpvote: true,
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		],
		annotationLinks: [],
		report: {
			counts: {
				users: 1,
				accounts: 1,
				sessions: 1,
				verifications: 1,
				geminiApiKeys: 1,
				personalAccessTokens: 0,
				importRuns: 0,
				importFiles: 0,
				likePages: 0,
				notifications: 0,
				segmentTypes: 0,
				pageLocaleTranslationProofs: 0,
				segmentMetadataTypes: 0,
				tags: 0,
				translationContexts: 0,
				pageViews: 0,
				segmentMetadata: 0,
				userSettings: 0,
				tagPages: 0,
				scriptures: 1,
				segments: 1,
				translations: 1,
				translationJobs: 1,
				translationVotes: 1,
				annotationLinks: 0,
			},
			skipped: {
				pages: 0,
				accounts: 0,
				sessions: 0,
				verifications: 0,
				geminiApiKeys: 0,
				personalAccessTokens: 0,
				importRuns: 0,
				importFiles: 0,
				likePages: 0,
				notifications: 0,
				segmentTypes: 0,
				pageLocaleTranslationProofs: 0,
				segmentMetadataTypes: 0,
				tags: 0,
				translationContexts: 0,
				pageViews: 0,
				segmentMetadata: 0,
				userSettings: 0,
				tagPages: 0,
				segments: 0,
				translations: 0,
				translationJobs: 0,
				translationVotes: 0,
				users: 0,
				annotationLinks: 0,
			},
		},
	};
}

describe("Turso migration target", () => {
	it("外部キー順のparameterized upsert文を再実行可能な形で作る", () => {
		const first = buildUpsertStatements(makePlan());
		const second = buildUpsertStatements(makePlan());

		expect(first).toHaveLength(10);
		expect(first.map(({ sql }) => sql)).toEqual([
			expect.stringContaining("INSERT INTO users"),
			expect.stringContaining("INSERT INTO accounts"),
			expect.stringContaining("INSERT INTO sessions"),
			expect.stringContaining("INSERT INTO verifications"),
			expect.stringContaining("INSERT INTO gemini_api_keys"),
			expect.stringContaining("INSERT INTO scriptures"),
			expect.stringContaining("INSERT INTO segments"),
			expect.stringContaining("INSERT INTO translation_jobs"),
			expect.stringContaining("INSERT INTO translations"),
			expect.stringContaining("INSERT INTO translation_votes"),
		]);
		expect(first).toEqual(second);
		expect(first[1]?.args).toContain("owner-1");
		expect(first[1]?.args).toContain("ciphertext-refresh");
		expect(first[2]?.args).toContain("session-value");
		expect(first[4]?.args).toContain("ciphertext-gemini");
		for (const { sql } of first) {
			expect(sql).toMatch(/\?/);
			expect(sql).not.toMatch(/libsql/i);
			expect(sql).not.toContain("ciphertext-refresh");
			expect(sql).not.toContain("session-value");
			expect(sql).not.toContain("ciphertext-gemini");
		}
	});

	it("大きなstatement集合を分割し、不正なbatch sizeを拒否する", () => {
		const statements = Array.from({ length: 401 }, () => ({
			sql: "SELECT 1",
			args: [],
		}));
		expect(chunkStatements(statements, 400)).toHaveLength(2);
		expect(() => chunkStatements(statements, 0)).toThrow(/positive integer/);
	});

	it("annotation linkの件数照合をSQLiteの式深度を超えない50組単位で合算する", async () => {
		const plan = makePlan();
		plan.annotationLinks = Array.from({ length: 51 }, (_, index) => ({
			mainSegmentId: 100 + index,
			annotationSegmentId: 200 + index,
			createdAt: "2025-01-01T00:00:00.000Z",
		}));
		plan.report.counts.annotationLinks = 51;
		const pairSizes: number[] = [];
		const target: TursoConnection = {
			batch: async () => {},
			all: async (sql, args = []) => {
				const table = /FROM ([a-z_]+)/.exec(sql)?.[1];
				if (
					table === "segment_annotation_links" ||
					table === "translation_votes" ||
					table === "tag_pages"
				) {
					const pairSize = args.length / 2;
					if (table === "segment_annotation_links") {
						pairSizes.push(pairSize);
						expect(pairSize).toBeLessThanOrEqual(50);
					}
					return { rows: [{ count: pairSize }] };
				}
				return { rows: [{ count: args.length }] };
			},
		};

		expect(await verifyMigrationCounts(target, plan)).toEqual(
			plan.report.counts,
		);
		expect(pairSizes).toEqual([50, 1]);
	});

	it("補助表の行も依存順のparameterized upsertへ変換する", () => {
		const plan = makePlan();
		plan.personalAccessTokens = [
			{
				id: 1,
				keyHash: "pat-hash",
				userId: "owner-1",
				name: "CLI",
				createdAt: "2025-01-01T00:00:00.000Z",
				lastUsedAt: null,
			},
		];
		plan.importRuns = [
			{
				id: 1,
				startedAt: "2025-01-01T00:00:00.000Z",
				finishedAt: null,
				status: "RUNNING",
			},
		];
		plan.importFiles = [
			{
				id: 1,
				importRunId: 1,
				path: "tipitaka.json",
				checksum: "checksum",
				status: "COMPLETED",
				message: "",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		];
		plan.likePages = [
			{
				id: 1,
				pageId: 1,
				createdAt: "2025-01-01T00:00:00.000Z",
				userId: "owner-1",
			},
		];
		plan.notifications = [
			{
				id: 1,
				userId: "owner-1",
				type: "PAGE_LIKE",
				read: false,
				createdAt: "2025-01-01T00:00:00.000Z",
				actorId: "owner-1",
				pageCommentId: 999,
				pageId: 999,
				segmentTranslationId: 999,
			},
		];
		plan.segmentTypes = [{ id: 1, label: "本文", key: "PRIMARY" }];
		plan.pageLocaleTranslationProofs = [
			{ id: 1, pageId: 1, locale: "ja", translationProofStatus: "PROOFREAD" },
		];
		plan.segmentMetadataTypes = [{ id: 1, key: "edition", label: "Edition" }];
		plan.tags = [{ id: 1, name: "sutta" }];
		plan.translationContexts = [
			{
				id: 1,
				userId: "owner-1",
				name: "context",
				context: "text",
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		plan.pageViews = [{ pageId: 1, count: 3 }];
		plan.segmentMetadata = [
			{
				id: 1,
				segmentId: 2,
				metadataTypeId: 1,
				value: "PTS",
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		];
		plan.userSettings = [
			{
				id: 1,
				userId: "owner-1",
				targetLocales: '["ja"]',
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			},
		];
		plan.tagPages = [{ tagId: 1, pageId: 1 }];

		const statements = buildUpsertStatements(plan);
		const sql = statements.map((statement) => statement.sql);
		expect(sql).toEqual(
			expect.arrayContaining([
				expect.stringContaining("INSERT INTO personal_access_tokens"),
				expect.stringContaining("INSERT INTO import_runs"),
				expect.stringContaining("INSERT INTO import_files"),
				expect.stringContaining("INSERT INTO like_pages"),
				expect.stringContaining("INSERT INTO notifications"),
				expect.stringContaining("INSERT INTO segment_types"),
				expect.stringContaining("INSERT INTO page_locale_translation_proofs"),
				expect.stringContaining("INSERT INTO segment_metadata_types"),
				expect.stringContaining("INSERT INTO tags"),
				expect.stringContaining("INSERT INTO translation_contexts"),
				expect.stringContaining("INSERT INTO page_views"),
				expect.stringContaining("INSERT INTO segment_metadata"),
				expect.stringContaining("INSERT INTO user_settings"),
				expect.stringContaining("INSERT INTO tag_pages"),
			]),
		);
		const pat = statements.find((statement) =>
			statement.sql.includes("personal_access_tokens"),
		);
		expect(pat?.args).toEqual([
			1,
			"pat-hash",
			"owner-1",
			"CLI",
			"2025-01-01T00:00:00.000Z",
			null,
		]);
		for (const statement of statements) {
			expect(statement.sql).not.toContain("pat-hash");
			expect(statement.sql).toMatch(/\?/);
		}
	});

	it("書き込み後に対象キーだけを件数照合する", async () => {
		const plan = makePlan();
		const batches: unknown[] = [];
		const target: TursoConnection = {
			batch: async (statements) => {
				batches.push(statements);
			},
			all: async (sql) => {
				const table = /FROM ([a-z_]+)/.exec(sql)?.[1];
				const count = table
					? (plan.report.counts[
							(
								{
									users: "users",
									accounts: "accounts",
									sessions: "sessions",
									verifications: "verifications",
									gemini_api_keys: "geminiApiKeys",
									scriptures: "scriptures",
									segments: "segments",
									translations: "translations",
									translation_jobs: "translationJobs",
									translation_votes: "translationVotes",
									segment_annotation_links: "annotationLinks",
								} as Record<string, keyof typeof plan.report.counts>
							)[table]
						] ?? 0)
					: 0;
				return { rows: [{ count }] };
			},
		};

		await applyMigrationPlan(target, plan, { batchSize: 2 });
		expect(batches).toHaveLength(5);
		expect(await verifyMigrationCounts(target, plan)).toEqual(
			plan.report.counts,
		);
	});

	it("公式Connectionのall/batch/closeだけを移行targetへ適合する", async () => {
		const batches: unknown[] = [];
		let closes = 0;
		const official: Pick<Connection, "all" | "batch" | "close"> = {
			all: async (sql, args) => {
				expect(sql).toContain("COUNT(*)");
				expect(args).toEqual(["id"]);
				return [{ count: 1 }];
			},
			batch: async (statements, mode) => {
				batches.push({ statements, mode });
				return [];
			},
			close: async () => {
				closes += 1;
			},
		};
		const target = adaptTursoConnection(official);

		expect("execute" in target).toBe(false);
		expect(await target.all("SELECT COUNT(*) AS count", ["id"])).toEqual({
			rows: [{ count: 1 }],
		});
		await target.batch(
			[{ sql: "INSERT INTO users (id) VALUES (?)", args: [1] }],
			"write",
		);
		await target.close?.();
		expect(batches).toEqual([
			{
				statements: [{ sql: "INSERT INTO users (id) VALUES (?)", args: [1] }],
				mode: "write",
			},
		]);
		expect(closes).toBe(1);
	});
});
