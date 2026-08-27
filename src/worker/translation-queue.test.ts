import { describe, expect, it, vi } from "vitest";
import type { SqlExecutor, TursoDatabase } from "@/db/turso-types";
import {
	handleTranslationQueue,
	isTranslationDeadLetterQueue,
	retryDelaySeconds,
} from "./translation-queue";

function queueDatabaseThatFailsWhileReadingTranslations(): {
	db: TursoDatabase;
	failedJobIds: string[];
} {
	const failedJobIds: string[] = [];
	const executor: SqlExecutor = {
		async get<T>(sql: string) {
			if (sql.includes("translation_jobs WHERE id")) {
				return {
					id: "job-1",
					scripture_id: 7,
					locale: "fr",
					status: "IN_PROGRESS",
					progress: 0,
					total: 1,
					error: "",
					model: "gpt-5-nano-2025-08-07",
					requested_by: "user-1",
					created_at: "2026-01-01T00:00:00.000Z",
					updated_at: "2026-01-01T00:00:00.000Z",
				} as T;
			}
			return undefined;
		},
		async all<_T>() {
			throw new Error("一時的なDB障害");
		},
		async run(sql: string, args = []) {
			if (sql.includes("SET status = 'FAILED'")) {
				const jobId = args[1];
				if (typeof jobId === "string") failedJobIds.push(jobId);
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
	return { db, failedJobIds };
}

function queueDatabaseWithActiveChunkLease(): TursoDatabase {
	const job = {
		id: "job-1",
		scripture_id: 7,
		status: "IN_PROGRESS",
		progress: 0,
		total: 1,
		error: "",
		model: "gpt-5-nano-2025-08-07",
		requested_by: "user-1",
		locale: "fr",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
	};
	const executor: SqlExecutor = {
		async get<T>(sql: string) {
			if (sql.includes("translation_jobs WHERE id")) return job as T;
			if (sql.includes("FROM translation_job_chunks")) {
				return {
					status: "PROCESSING",
					lease_until: new Date(Date.now() + 600_000).toISOString(),
				} as T;
			}
			return undefined;
		},
		async all<T>() {
			return [] as T[];
		},
		async run() {
			return { changes: 1, lastInsertRowid: undefined };
		},
	};
	return {
		...executor,
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(executor);
		},
		async close() {},
	};
}

function queueDatabaseThatFailsWhileMarkingJobFailed(): TursoDatabase {
	const executor: SqlExecutor = {
		async get<T>() {
			return undefined as T | undefined;
		},
		async all<T>() {
			return [] as T[];
		},
		async run(sql: string) {
			if (sql.includes("SET status = 'FAILED'")) {
				throw new Error("一時的なDB障害");
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
	};
	return {
		...executor,
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(executor);
		},
		async close() {},
	};
}

describe("翻訳Queueの再試行", () => {
	it("指数バックオフを使い、再試行上限はWranglerへ委譲する", () => {
		expect(retryDelaySeconds(1)).toBe(1);
		expect(retryDelaySeconds(2)).toBe(2);
		expect(retryDelaySeconds(3)).toBe(4);
		expect(retryDelaySeconds(0)).toBe(1);
	});

	it("通常QueueとDLQをbatch.queueで判別する", () => {
		expect(isTranslationDeadLetterQueue("digital-buddhism-translations")).toBe(
			false,
		);
		expect(
			isTranslationDeadLetterQueue("digital-buddhism-translations-dlq"),
		).toBe(true);
	});

	it("一時的な処理障害ではQueueメッセージを再試行する", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		await handleTranslationQueue(
			{
				queue: "digital-buddhism-translations",
				messages: [
					{
						body: {
							kind: "translation-chunk",
							jobId: "job-1",
							chunkId: "job-1:chunk:0",
							chunkIndex: 0,
							totalChunks: 1,
							scriptureId: 7,
							locale: "fr",
							model: "gpt-5-nano-2025-08-07",
							translationContext: "",
							segments: [{ id: 1, number: 0, text: "Hello" }],
						},
						attempts: 1,
						ack,
						retry,
					},
				],
			},
			{
				db: queueDatabaseThatFailsWhileReadingTranslations().db,
				queue: { send: async () => undefined },
				providerConfig: {},
			},
		);

		expect(retry).toHaveBeenCalledWith({ delaySeconds: 1 });
		expect(ack).not.toHaveBeenCalled();
	});

	it("不正なQueue payloadはjobIdをFAILEDにして再試行せずackする", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		const fixture = queueDatabaseThatFailsWhileReadingTranslations();
		await handleTranslationQueue(
			{
				queue: "digital-buddhism-translations",
				messages: [
					{ body: { kind: "translation-chunk", jobId: "job-1" }, ack, retry },
				],
			},
			{
				db: fixture.db,
				queue: { send: async () => undefined },
				providerConfig: {},
			},
		);

		expect(ack).toHaveBeenCalledOnce();
		expect(retry).not.toHaveBeenCalled();
		expect(fixture.failedJobIds).toEqual(["job-1"]);
	});

	it("retryable失敗はattempt上限でもackせずDLQへ委譲する", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		await handleTranslationQueue(
			{
				queue: "digital-buddhism-translations",
				messages: [
					{
						body: {
							kind: "translation-chunk",
							jobId: "job-1",
							chunkId: "job-1:chunk:0",
							chunkIndex: 0,
							totalChunks: 1,
							scriptureId: 7,
							locale: "fr",
							model: "gpt-5-nano-2025-08-07",
							translationContext: "",
							segments: [{ id: 1, number: 0, text: "Hello" }],
						},
						attempts: 3,
						ack,
						retry,
					},
				],
			},
			{
				db: queueDatabaseThatFailsWhileReadingTranslations().db,
				queue: { send: async () => undefined },
				providerConfig: {},
			},
		);

		expect(retry).toHaveBeenCalledWith({ delaySeconds: 4 });
		expect(ack).not.toHaveBeenCalled();
	});

	it("DLQ payloadはジョブをFAILEDにしてackし、再試行しない", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		const fixture = queueDatabaseThatFailsWhileReadingTranslations();
		await handleTranslationQueue(
			{
				queue: "digital-buddhism-translations-dlq",
				messages: [
					{
						body: {
							kind: "translation-chunk",
							jobId: "job-1",
							chunkId: "job-1:chunk:0",
							chunkIndex: 0,
							totalChunks: 1,
							scriptureId: 7,
							locale: "fr",
							model: "gpt-5-nano-2025-08-07",
							translationContext: "",
							segments: [{ id: 1, number: 0, text: "Hello" }],
						},
						ack,
						retry,
					},
				],
			},
			{
				db: fixture.db,
				queue: { send: async () => undefined },
				providerConfig: {},
			},
		);

		expect(ack).toHaveBeenCalledOnce();
		expect(retry).not.toHaveBeenCalled();
		expect(fixture.failedJobIds).toEqual(["job-1"]);
	});

	it("active lease中の再配信はlease期限後に再試行しackしない", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		await handleTranslationQueue(
			{
				queue: "digital-buddhism-translations",
				messages: [
					{
						body: {
							kind: "translation-chunk",
							jobId: "job-1",
							chunkId: "job-1:chunk:0",
							chunkIndex: 0,
							totalChunks: 1,
							scriptureId: 7,
							locale: "fr",
							model: "gpt-5-nano-2025-08-07",
							translationContext: "",
							segments: [{ id: 1, number: 0, text: "Hello" }],
						},
						ack,
						retry,
					},
				],
			},
			{
				db: queueDatabaseWithActiveChunkLease(),
				queue: { send: async () => undefined },
				providerConfig: { openaiApiKey: "test-key" },
			},
		);

		expect(retry).toHaveBeenCalledWith({ delaySeconds: expect.any(Number) });
		expect(ack).not.toHaveBeenCalled();
	});

	it("通常QueueのFAILED更新がDB障害で失敗したらackせず再配信へ委譲する", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		await expect(
			handleTranslationQueue(
				{
					queue: "digital-buddhism-translations",
					messages: [
						{
							body: { kind: "translation-chunk", jobId: "job-1" },
							ack,
							retry,
						},
					],
				},
				{
					db: queueDatabaseThatFailsWhileMarkingJobFailed(),
					queue: { send: async () => undefined },
					providerConfig: {},
				},
			),
		).rejects.toThrow("一時的なDB障害");
		expect(ack).not.toHaveBeenCalled();
		expect(retry).not.toHaveBeenCalled();
	});

	it("DLQのFAILED更新がDB障害で失敗したらackせず再配信へ委譲する", async () => {
		const ack = vi.fn();
		const retry = vi.fn();
		await expect(
			handleTranslationQueue(
				{
					queue: "digital-buddhism-translations-dlq",
					messages: [
						{
							body: { kind: "translation-chunk", jobId: "job-1" },
							ack,
							retry,
						},
					],
				},
				{
					db: queueDatabaseThatFailsWhileMarkingJobFailed(),
					queue: { send: async () => undefined },
					providerConfig: {},
				},
			),
		).rejects.toThrow("一時的なDB障害");
		expect(ack).not.toHaveBeenCalled();
		expect(retry).not.toHaveBeenCalled();
	});
});
