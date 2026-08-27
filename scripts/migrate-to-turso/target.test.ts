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
				createdAt: "2025-01-01T00:00:00.000Z",
			},
		],
		scriptures: [
			{
				id: 1,
				slug: "tipitaka",
				title: "Tipitaka",
				sourceLocale: "pi",
				ownerUserId: "owner-1",
				parentId: null,
				position: 0,
				publishedAt: null,
			},
		],
		segments: [
			{
				id: 2,
				scriptureId: 1,
				kind: "PRIMARY",
				position: 0,
				sourceText: "Tipitaka",
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
				scriptures: 1,
				segments: 1,
				translations: 1,
				translationJobs: 1,
				translationVotes: 1,
				annotationLinks: 0,
			},
			skipped: {
				pages: 0,
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

		expect(first).toHaveLength(6);
		expect(first.map(({ sql }) => sql)).toEqual([
			expect.stringContaining("INSERT INTO users"),
			expect.stringContaining("INSERT INTO scriptures"),
			expect.stringContaining("INSERT INTO segments"),
			expect.stringContaining("INSERT INTO translation_jobs"),
			expect.stringContaining("INSERT INTO translations"),
			expect.stringContaining("INSERT INTO translation_votes"),
		]);
		expect(first).toEqual(second);
		expect(first[1]?.args).toContain("owner-1");
		for (const { sql, args } of first) {
			expect(sql).not.toMatch(/libsql|password|secret|token/i);
			expect(args.join(" ")).not.toMatch(/turso|token|password|secret/i);
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
		expect(batches).toHaveLength(3);
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
