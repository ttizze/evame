import { describe, expect, it, vi } from "vitest";
import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "@/db/turso-types";
import {
	createAndEnqueueTranslationJob,
	reconcilePendingTranslationJobs,
	startTranslationJob,
} from "./service";
import type {
	TranslationJobRequest,
	TranslationQueue,
	TranslationQueueMessage,
	TranslationQueueSendOptions,
} from "./types";

function createJobDatabase(options: { statusUpdateError?: Error } = {}) {
	const state: { job: TranslationJobRow } = {
		job: {
			id: "job-1",
			scripture_id: 7,
			locale: "fr",
			status: "PENDING",
			progress: 0,
			total: 0,
			error: "",
			model: "gemini-2.5-flash",
			requested_by: "user-1",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
			translation_context: "",
		},
	};
	const db: TursoDatabase = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("FROM sessions AS s")) {
				return {
					id: "user-1",
					email: "user@example.com",
					name: "User",
					expires_at: "2099-01-01T00:00:00.000Z",
				} as T;
			}
			if (sql.includes("SELECT id FROM scriptures")) {
				return { id: 7 } as T;
			}
			if (sql.includes("FROM translation_jobs WHERE id")) {
				return String(args[0]) === state.job.id ? (state.job as T) : undefined;
			}
			return undefined;
		},
		async all<T>(sql: string, _args = []) {
			if (
				sql.includes("status = 'PENDING'") &&
				sql.includes("updated_at <= ?")
			) {
				return [state.job] as T[];
			}
			return [] as T[];
		},
		async run(sql: string, args = []) {
			if (sql.includes("INSERT INTO translation_jobs")) {
				state.job = {
					...state.job,
					id: String(args[0]),
					scripture_id: Number(args[1]),
					locale: String(args[2]),
					model: String(args[3]),
					requested_by: String(args[4]),
					translation_context: String(args[5] ?? ""),
				};
			}
			if (sql.includes("SET status = 'FAILED'")) {
				if (options.statusUpdateError) throw options.statusUpdateError;
				state.job = {
					...state.job,
					status: "FAILED",
					error: String(args[0]),
				};
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(this);
		},
		async close() {},
	};
	return { db, state };
}

function createStartJobDatabase(
	segmentCount: number,
	segmentTextLength: number,
) {
	const segments = Array.from({ length: segmentCount }, (_, index) => ({
		id: index + 1,
		position: index,
		source_text: "x".repeat(segmentTextLength),
	}));
	let job: TranslationJobRow = {
		id: "job-start",
		scripture_id: 7,
		locale: "fr",
		status: "PENDING",
		progress: 0,
		total: 0,
		error: "",
		model: "gemini-2.0-flash",
		requested_by: "user-1",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
	};
	const chunkStates = new Map<number, string>();
	const executor: SqlExecutor = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("translation_jobs WHERE id")) return job as T;
			if (sql.includes("FROM translation_job_chunks")) {
				const chunkIndex = Number(args[1]);
				return {
					status: chunkStates.get(chunkIndex),
					lease_until: null,
				} as T;
			}
			if (sql.includes("SELECT title FROM scriptures"))
				return { title: "Sutta" } as T;
			return undefined;
		},
		async all<T>(sql: string) {
			if (sql.includes("FROM segments")) return segments as T[];
			return [] as T[];
		},
		async run(sql: string, args = []) {
			if (sql.includes("INSERT INTO translation_job_chunks")) {
				chunkStates.set(Number(args[1]), "PENDING");
			}
			if (sql.includes("SET status = 'ENQUEUING'")) {
				chunkStates.set(Number(args[3]), "ENQUEUING");
			}
			if (
				sql.includes("SET status = ?") &&
				sql.includes("translation_job_chunks")
			) {
				chunkStates.set(Number(args[2]), String(args[0]));
			}
			if (sql.includes("SET total = ?")) {
				job = {
					...job,
					total: Number(args[0]),
					status: args[1] as TranslationJobRow["status"],
					progress: Number(args[2]),
				};
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
	return { db, segments };
}

const request: TranslationJobRequest = {
	scriptureId: 7,
	locale: "fr",
	model: "gemini-2.5-flash",
	translationContext: "",
	userId: "user-1",
	idempotencyKey: "job-1",
};

describe("翻訳ジョブ作成ユースケース", () => {
	it("ジョブを作成してQueueへ同じ冪等キーで投入する", async () => {
		const { db } = createJobDatabase();
		const messages: TranslationQueueMessage[] = [];
		const queue: TranslationQueue = {
			send: async (message) => {
				messages.push(message);
			},
		};

		const job = await createAndEnqueueTranslationJob(db, queue, request);

		expect(job.id).toBe("job-1");
		expect(messages).toEqual([
			{
				kind: "translation-job",
				jobId: "job-1",
				translationContext: "",
				idempotencyKey: "job-1",
			},
		]);
	});

	it("保存した翻訳コンテキストを初回Queueと定期再投入で一致させる", async () => {
		const { db } = createJobDatabase();
		const messages: Extract<
			TranslationQueueMessage,
			{ kind: "translation-job" }
		>[] = [];
		const queue: TranslationQueue = {
			send: async (message) => {
				if (message.kind === "translation-job") messages.push(message);
			},
		};
		const context = "固有名詞は既存の用語集に合わせる";

		await createAndEnqueueTranslationJob(db, queue, {
			...request,
			translationContext: context,
		});
		await reconcilePendingTranslationJobs(db, queue, {
			now: Date.parse("2026-01-01T00:10:00.000Z"),
			staleAfterMs: 5 * 60 * 1_000,
		});

		expect(messages).toHaveLength(2);
		expect(messages.map((message) => message.translationContext)).toEqual([
			context,
			context,
		]);
	});

	it("Queue投入に失敗したらジョブをFAILEDにして秘密を含まないエラーを返す", async () => {
		const { db, state } = createJobDatabase();
		const queueError = new Error("queue-provider-secret");
		const queue: TranslationQueue = {
			send: async () => {
				throw queueError;
			},
		};

		await expect(
			createAndEnqueueTranslationJob(db, queue, request),
		).rejects.toMatchObject({
			message: "翻訳Queueへの登録に失敗しました。",
			cause: queueError,
		});
		expect(state.job).toMatchObject({
			status: "FAILED",
			error: "翻訳Queueへの登録に失敗しました。",
		});
	});

	it("QueueとFAILED更新が同時に失敗しても秘密を公開せず、定期処理で自動再投入できる", async () => {
		const queueError = new Error("queue-token-secret");
		const statusUpdateError = new Error("DATABASE_URL=database-secret");
		const { db, state } = createJobDatabase({ statusUpdateError });
		let attempts = 0;
		const queue: TranslationQueue = {
			send: async () => {
				attempts += 1;
				if (attempts === 1) throw queueError;
			},
		};

		const firstAttempt = createAndEnqueueTranslationJob(db, queue, request);
		await expect(firstAttempt).rejects.toMatchObject({
			message: "翻訳Queueへの登録に失敗しました。",
			cause: queueError,
		});
		await expect(firstAttempt).rejects.not.toThrow("database-secret");
		expect(state.job.status).toBe("PENDING");

		await expect(
			reconcilePendingTranslationJobs(db, queue, {
				now: Date.parse("2026-01-01T00:10:00.000Z"),
				staleAfterMs: 5 * 60 * 1_000,
			}),
		).resolves.toEqual({
			inspected: 1,
			enqueued: 1,
			failed: 0,
			timedOut: false,
		});
		expect(attempts).toBe(2);
	});

	it("1件の再投入失敗でも後続jobを処理し、次回実行へ残す", async () => {
		const jobs: TranslationJobRow[] = [1, 2].map((id) => ({
			id: `job-${id}`,
			scripture_id: 7,
			locale: "fr",
			status: "PENDING",
			progress: 0,
			total: 0,
			error: "",
			model: "gemini-2.5-flash",
			requested_by: "user-1",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		}));
		const db: TursoDatabase = {
			async get<T>() {
				return undefined as T | undefined;
			},
			async all<T>() {
				return jobs as T[];
			},
			async run() {
				return { changes: 0, lastInsertRowid: undefined };
			},
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(this);
			},
			async close() {},
		};
		const sent: string[] = [];
		const queue: TranslationQueue = {
			send: async (message) => {
				if (message.kind !== "translation-job") return;
				if (message.jobId === "job-1")
					throw new Error("temporary queue failure");
				sent.push(message.jobId);
			},
		};

		await expect(
			reconcilePendingTranslationJobs(db, queue, {
				now: Date.parse("2026-01-01T00:10:00.000Z"),
			}),
		).resolves.toMatchObject({
			inspected: 2,
			enqueued: 1,
			failed: 1,
			timedOut: false,
		});
		expect(sent).toEqual(["job-2"]);
	});

	it("PENDING以外のjobを再投入しない", async () => {
		const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"] as const;
		const jobRows: TranslationJobRow[] = statuses.map((status, index) => ({
			id: `job-${index}`,
			scripture_id: 7,
			locale: "fr",
			status,
			progress: status === "COMPLETED" ? 100 : 0,
			total: status === "COMPLETED" ? 1 : 0,
			error: "",
			model: "gemini-2.5-flash",
			requested_by: "user-1",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		}));
		const db: TursoDatabase = {
			async get<T>() {
				return undefined as T | undefined;
			},
			async all<T>() {
				return jobRows as T[];
			},
			async run() {
				return { changes: 0, lastInsertRowid: undefined };
			},
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(this);
			},
			async close() {},
		};
		const sent: string[] = [];

		await expect(
			reconcilePendingTranslationJobs(db, {
				send: async (message) => {
					if (message.kind === "translation-job") sent.push(message.jobId);
				},
			}),
		).resolves.toMatchObject({ inspected: 4, enqueued: 1, failed: 0 });
		expect(sent).toEqual(["job-0"]);
	});

	it("batch上限と時間境界を守り、未処理jobを次回へ委譲する", async () => {
		const jobs: TranslationJobRow[] = [1, 2, 3].map((id) => ({
			id: `job-${id}`,
			scripture_id: 7,
			locale: "fr",
			status: "PENDING",
			progress: 0,
			total: 0,
			error: "",
			model: "gemini-2.5-flash",
			requested_by: "user-1",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		}));
		let clockCalls = 0;
		const db: TursoDatabase = {
			async get<T>() {
				return undefined as T | undefined;
			},
			async all<T>() {
				return jobs as T[];
			},
			async run() {
				return { changes: 0, lastInsertRowid: undefined };
			},
			async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
				return callback(this);
			},
			async close() {},
		};
		const sent: string[] = [];
		const now = Date.parse("2026-01-01T00:10:00.000Z");
		const queue: TranslationQueue = {
			send: async (message) => {
				if (message.kind === "translation-job") sent.push(message.jobId);
			},
		};

		await expect(
			reconcilePendingTranslationJobs(db, queue, {
				now,
				batchSize: 2,
				clock: () => now,
			}),
		).resolves.toMatchObject({
			inspected: 2,
			enqueued: 2,
			timedOut: false,
		});
		expect(sent).toEqual(["job-1", "job-2"]);

		sent.length = 0;
		clockCalls = 0;
		await expect(
			reconcilePendingTranslationJobs(db, queue, {
				now,
				batchSize: 3,
				timeBudgetMs: 500,
				clock: () => {
					clockCalls += 1;
					return clockCalls < 2 ? now : now + 1_000;
				},
			}),
		).resolves.toMatchObject({
			inspected: 1,
			enqueued: 1,
			timedOut: true,
		});
		expect(sent).toEqual(["job-1"]);
	});

	it("101チャンクかつ合計256KB超でも各チャンクを個別送信する", async () => {
		const { db } = createStartJobDatabase(101, 10_001);
		const messages: TranslationQueueMessage[] = [];
		const send = vi.fn(
			async (
				message: TranslationQueueMessage,
				_options?: TranslationQueueSendOptions,
			) => {
				messages.push(message);
			},
		);
		const sendBatch = vi.fn(async () => undefined);
		const queue = { send, sendBatch };

		const job = await startTranslationJob(db, queue, "job-start", "");

		expect(job).toMatchObject({ status: "IN_PROGRESS", total: 101 });
		expect(send).toHaveBeenCalledTimes(101);
		expect(sendBatch).not.toHaveBeenCalled();
		expect(messages[0]).toMatchObject({
			kind: "translation-chunk",
			chunkIndex: 0,
			totalChunks: 101,
		});
		expect(messages[100]).toMatchObject({
			kind: "translation-chunk",
			chunkIndex: 100,
			totalChunks: 101,
		});

		const serializedSizes = messages.map(
			(message) => new TextEncoder().encode(JSON.stringify(message)).byteLength,
		);
		expect(Math.max(...serializedSizes)).toBeLessThan(128 * 1024);
		expect(
			serializedSizes.reduce((total, size) => total + size, 0),
		).toBeGreaterThan(256 * 1024);
	});
});
