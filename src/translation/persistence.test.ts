import { describe, expect, it } from "vitest";
import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "@/db/turso-types";
import { InvalidInputError, NotFoundError } from "@/domain/errors";
import {
	getEncryptedGeminiApiKey,
	getOrCreateAiUser,
	getUserPlan,
	listStalePendingTranslationJobs,
	mapTranslationJob,
	saveAiTranslations,
	updateTranslationJobProgress,
} from "./persistence";

describe("翻訳ジョブ行の永続化境界", () => {
	it("古いPENDINGかつ公開経典のjobだけを更新時刻順の上限付きで取得する", async () => {
		let query = "";
		let queryArgs: readonly unknown[] = [];
		const db: SqlExecutor = {
			async get<T>() {
				return undefined as T | undefined;
			},
			async all<T>(sql: string, args = []) {
				query = sql;
				queryArgs = args;
				return [] as T[];
			},
			async run() {
				return { changes: 0, lastInsertRowid: undefined };
			},
		};

		await listStalePendingTranslationJobs(db, "2026-01-01T00:05:00.000Z", 25);

		expect(query).toContain("status = 'PENDING'");
		expect(query).toContain("updated_at <= ?");
		expect(query).toContain("published_at IS NOT NULL");
		expect(query).toContain("ORDER BY updated_at ASC, id ASC");
		expect(query).toContain("LIMIT ?");
		expect(queryArgs).toEqual(["2026-01-01T00:05:00.000Z", 25]);
	});

	it("TEXTのジョブIDとnullableなrequested_byをアプリ型へ変換する", () => {
		expect(
			mapTranslationJob({
				id: "job-abc",
				scripture_id: 42,
				locale: "pt-br",
				status: "IN_PROGRESS",
				progress: 33,
				total: 3,
				error: "",
				model: "gpt-5-nano-2025-08-07",
				requested_by: null,
				created_at: "2026-08-27T00:00:00.000Z",
				updated_at: "2026-08-27T00:00:01.000Z",
				translation_context: "既存用語を優先する",
			}),
		).toMatchObject({
			id: "job-abc",
			scriptureId: 42,
			requestedBy: null,
			translationContext: "既存用語を優先する",
		});
	});

	it("0003以前のjob行では翻訳コンテキストを空文字へ補完する", () => {
		expect(
			mapTranslationJob({
				id: "legacy-job",
				scripture_id: 42,
				locale: "pt-br",
				status: "PENDING",
				progress: 0,
				total: 0,
				error: "",
				model: "gpt-5-nano-2025-08-07",
				requested_by: null,
				created_at: "2026-08-27T00:00:00.000Z",
				updated_at: "2026-08-27T00:00:01.000Z",
			}),
		).toMatchObject({ translationContext: "" });
	});

	it("進捗が100を超える壊れたDB行を拒否する", () => {
		expect(() =>
			mapTranslationJob({
				id: "job-abc",
				scripture_id: 42,
				locale: "fr",
				status: "COMPLETED",
				progress: 101,
				total: 1,
				error: "",
				model: "gpt-5-nano-2025-08-07",
				requested_by: "user-1",
				created_at: "2026-08-27T00:00:00.000Z",
				updated_at: "2026-08-27T00:00:01.000Z",
			}),
		).toThrow(InvalidInputError);
	});

	it("非公開経典に属するセグメントへのAI翻訳保存を拒否する", async () => {
		const executor: SqlExecutor = {
			async get<T>(sql: string, _args = []) {
				if (sql.includes("published_at IS NOT NULL")) return undefined;
				return undefined as T | undefined;
			},
			async all<T>(_sql: string, _args = []) {
				return [] as T[];
			},
			async run(_sql: string, _args = []) {
				return { changes: 1, lastInsertRowid: undefined };
			},
		};
		const db: TursoDatabase = {
			...executor,
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(executor);
			},
			async close() {},
		};

		await expect(
			saveAiTranslations(db, {
				jobId: "job-1",
				locale: "ja",
				model: "gemini-2.5-flash",
				requestedBy: "user-1",
				translations: [{ number: 0, text: "訳文" }],
				segments: [{ id: 7, number: 0, text: "source" }],
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("ユーザーのプランと暗号化済みGemini keyを読み取る", async () => {
		const db: SqlExecutor = {
			async get<T>(sql: string) {
				if (sql.includes("SELECT plan FROM users")) {
					return { plan: "premium" } as T;
				}
				return { api_key: "encrypted-key" } as T;
			},
			async all<T>() {
				return [] as T[];
			},
			async run() {
				return { changes: 0, lastInsertRowid: undefined };
			},
		};

		expect(await getUserPlan(db, "user-1")).toBe("premium");
		expect(await getEncryptedGeminiApiKey(db, "user-1")).toBe("encrypted-key");
	});

	it("AI翻訳用ユーザーをモデル名で冪等に取得する", async () => {
		let inserted = false;
		const db: TursoDatabase = {
			async get<T>(sql: string) {
				if (sql.includes("WHERE handle = ?")) {
					return inserted ? ({ id: "ai-user-1" } as T) : undefined;
				}
				return undefined;
			},
			async all<T>() {
				return [] as T[];
			},
			async run(sql: string) {
				if (sql.includes("INSERT INTO users")) inserted = true;
				return { changes: 1, lastInsertRowid: undefined };
			},
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(this);
			},
			async close() {},
		};

		const first = await getOrCreateAiUser(db, "gemini-2.5-flash");
		const second = await getOrCreateAiUser(db, "gemini-2.5-flash");
		expect(first).toBeTruthy();
		expect(second).toBe("ai-user-1");
	});

	it("AI翻訳を作成者ではなくis_aiユーザーのuser_idで保存する", async () => {
		const runs: Array<{ sql: string; args: readonly unknown[] }> = [];
		const executor: SqlExecutor = {
			async get<T>(sql: string) {
				if (sql.includes("WHERE handle = ?")) return undefined;
				if (sql.includes("FROM segments")) return { id: 7 } as T;
				return undefined;
			},
			async all<T>() {
				return [] as T[];
			},
			async run(sql: string, args = []) {
				runs.push({ sql, args });
				return { changes: 1, lastInsertRowid: undefined };
			},
		};
		const db: TursoDatabase = {
			...executor,
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(executor);
			},
			async close() {},
		};

		await saveAiTranslations(db, {
			jobId: "job-1",
			locale: "fr",
			model: "gemini-2.5-flash",
			requestedBy: "requester-1",
			translations: [{ number: 0, text: "Bonjour" }],
			segments: [{ id: 7, number: 0, text: "Hello" }],
		});

		expect(runs[0]?.sql).toContain("is_ai");
		expect(runs[0]?.sql).toContain("VALUES (?, ?, ?, ?, 1)");
		expect(runs[1]?.sql).toContain("INSERT INTO translations");
		expect(runs[1]?.args[3]).not.toBe("requester-1");
	});

	it("チャンクの再配信では進捗を二重加算せず、全完了時だけ100にする", async () => {
		const segments = [0, 1, 2].map((number) => ({
			id: number + 1,
			position: number,
			source_text: "x".repeat(10_001),
		}));
		let completedSegmentIds = [3];
		const job: TranslationJobRow = {
			id: "job-1",
			scripture_id: 7,
			locale: "fr",
			status: "IN_PROGRESS",
			progress: 0,
			total: 3,
			error: "",
			model: "gemini-2.0-flash",
			requested_by: "requester-1",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		};
		const executor: SqlExecutor = {
			async get<T>(sql: string) {
				if (sql.includes("translation_jobs WHERE id")) return job as T;
				return undefined;
			},
			async all<T>(sql: string) {
				if (sql.includes("FROM segments")) return segments as T[];
				if (sql.includes("FROM translations")) {
					return completedSegmentIds.map((segment_id) => ({
						segment_id,
					})) as T[];
				}
				return [] as T[];
			},
			async run(sql: string, args = []) {
				if (sql.includes("SET status = ?, progress = ?")) {
					job.status = args[0] as TranslationJobRow["status"];
					job.progress = Number(args[1]);
				}
				return { changes: 1, lastInsertRowid: undefined };
			},
		};
		const db: TursoDatabase = {
			...executor,
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(executor);
			},
			async close() {},
		};

		const first = await updateTranslationJobProgress(db, "job-1");
		const duplicate = await updateTranslationJobProgress(db, "job-1");
		expect(first.progress).toBe(33);
		expect(duplicate.progress).toBe(33);

		completedSegmentIds = [1, 2, 3];
		const completed = await updateTranslationJobProgress(db, "job-1");
		expect(completed).toMatchObject({ status: "COMPLETED", progress: 100 });
	});

	it("同じAI jobの翻訳行を再保存しても重複追加しない", async () => {
		const runs: Array<{ sql: string; args: readonly unknown[] }> = [];
		const executor: SqlExecutor = {
			async get<T>(sql: string) {
				if (sql.includes("WHERE handle = ?")) return { id: "ai-user-1" } as T;
				if (sql.includes("FROM segments")) return { id: 7 } as T;
				return undefined;
			},
			async all<T>() {
				return [] as T[];
			},
			async run(sql: string, args = []) {
				runs.push({ sql, args });
				return {
					changes: sql.includes("INSERT INTO translations") ? 0 : 1,
					lastInsertRowid: undefined,
				};
			},
		};
		const db: TursoDatabase = {
			...executor,
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(executor);
			},
			async close() {},
		};

		const inserted = await saveAiTranslations(db, {
			jobId: "job-1",
			locale: "fr",
			model: "gemini-2.5-flash",
			requestedBy: "requester-1",
			translations: [{ number: 0, text: "Bonjour" }],
			segments: [{ id: 7, number: 0, text: "Hello" }],
		});

		expect(inserted).toBe(0);
		expect(runs.at(-1)?.sql).toContain("NOT EXISTS");
	});
});
