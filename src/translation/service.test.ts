import { describe, expect, it } from "vitest";
import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "@/db/turso-types";
import { createAndEnqueueTranslationJob } from "./service";
import type {
	TranslationJobRequest,
	TranslationQueue,
	TranslationQueueMessage,
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

const request: TranslationJobRequest = {
	scriptureId: 7,
	locale: "fr",
	model: "gemini-2.5-flash",
	translationContext: "",
	sessionToken: "session-token",
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
});
