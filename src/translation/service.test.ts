import { describe, expect, it, vi } from "vitest";
import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "@/db/turso-types";
import { createAndEnqueueTranslationJob, startTranslationJob } from "./service";
import type {
	TranslationJobRequest,
	TranslationQueue,
	TranslationQueueMessage,
	TranslationQueueSendOptions,
} from "./types";

function createJobDatabase() {
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
		async all<T>(_sql: string, _args = []) {
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
				};
			}
			if (sql.includes("SET status = 'FAILED'")) {
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

	it("Queue投入に失敗したらジョブをFAILEDにして元のエラーを返す", async () => {
		const { db, state } = createJobDatabase();
		const queue: TranslationQueue = {
			send: async () => {
				throw new Error("queue unavailable");
			},
		};

		await expect(
			createAndEnqueueTranslationJob(db, queue, request),
		).rejects.toThrow("queue unavailable");
		expect(state.job).toMatchObject({
			status: "FAILED",
			error: "翻訳Queueへの登録に失敗しました。",
		});
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
