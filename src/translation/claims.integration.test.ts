// @vitest-environment node

import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { migrateDatabase } from "@/db/migrations";
import type {
	SqlArguments,
	SqlExecutor,
	TursoDatabase,
} from "@/db/turso-types";
import {
	claimTranslationJobChunk,
	ensureTranslationJobChunks,
} from "./persistence";
import {
	processTranslationChunk,
	startTranslationJob,
	TranslationChunkBusyError,
} from "./service";
import type { TranslationQueueMessage } from "./types";

function createSqliteDatabase(): TursoDatabase {
	const sqlite = new DatabaseSync(":memory:");
	let transactionTail = Promise.resolve();
	type SqliteInput = null | number | bigint | string | NodeJS.ArrayBufferView;
	const sqliteArguments = (args: SqlArguments) =>
		args.map((argument) =>
			typeof argument === "boolean" ? Number(argument) : argument,
		) as SqliteInput[];
	const executor: SqlExecutor = {
		async get<T>(sql: string, args: SqlArguments = []) {
			return sqlite.prepare(sql).get(...sqliteArguments(args)) as T | undefined;
		},
		async all<T>(sql: string, args: SqlArguments = []) {
			return sqlite.prepare(sql).all(...sqliteArguments(args)) as T[];
		},
		async run(sql: string, args: SqlArguments = []) {
			const result = sqlite.prepare(sql).run(...sqliteArguments(args));
			return {
				changes: Number(result.changes),
				lastInsertRowid: result.lastInsertRowid,
			};
		},
	};
	return {
		...executor,
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			const previous = transactionTail;
			let release!: () => void;
			transactionTail = new Promise<void>((resolve) => {
				release = resolve;
			});
			await previous;
			sqlite.exec("BEGIN IMMEDIATE");
			try {
				const result = await callback(executor);
				sqlite.exec("COMMIT");
				return result;
			} catch (error) {
				sqlite.exec("ROLLBACK");
				throw error;
			} finally {
				release();
			}
		},
		async close() {
			sqlite.close();
		},
	};
}

async function seedTranslationJob(
	db: TursoDatabase,
	options: { id: string; model?: string; segmentCount?: number },
): Promise<void> {
	await migrateDatabase(db);
	await db.run("INSERT INTO users (id, email, handle) VALUES (?, ?, ?)", [
		"requester-1",
		"requester@example.com",
		"requester",
	]);
	await db.run("INSERT INTO segment_types (id, label, key) VALUES (?, ?, ?)", [
		1,
		"Primary",
		"PRIMARY",
	]);
	await db.run(
		`INSERT INTO scriptures
			(id, slug, title, source_locale, owner_user_id, published_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
		[7, `scripture-${options.id}`, "Sutta", "pi", "requester-1", "2026-01-01"],
	);
	const segmentCount = options.segmentCount ?? 1;
	for (let index = 0; index < segmentCount; index += 1) {
		await db.run(
			`INSERT INTO segments
				(scripture_id, segment_type_id, kind, position, source_text, text_and_occurrence_hash)
				VALUES (?, ?, 'PRIMARY', ?, ?, ?)`,
			[7, 1, index, "x".repeat(10_001), `hash-${options.id}-${index}`],
		);
	}
	await db.run(
		`INSERT INTO translation_jobs
			(id, scripture_id, locale, status, progress, total, error, model, requested_by)
			VALUES (?, ?, ?, 'PENDING', 0, 0, '', ?, ?)`,
		[
			options.id,
			7,
			"fr",
			options.model ?? "gpt-5-nano-2025-08-07",
			"requester-1",
		],
	);
}

async function chunkStates(db: TursoDatabase, jobId: string) {
	return db.all<{ chunk_index: number; status: string }>(
		"SELECT chunk_index, status FROM translation_job_chunks WHERE job_id = ? ORDER BY chunk_index",
		[jobId],
	);
}

describe("翻訳Queueの永続claimとoutbox", () => {
	it("部分enqueue後のroot再配信は投入済みchunkを重複送信しない", async () => {
		const db = createSqliteDatabase();
		try {
			await seedTranslationJob(db, {
				id: "job-partial",
				model: "gemini-2.0-flash",
				segmentCount: 3,
			});
			const firstSent: Array<
				Extract<TranslationQueueMessage, { kind: "translation-chunk" }>
			> = [];
			await expect(
				startTranslationJob(
					db,
					{
						send: async (message) => {
							if (message.kind !== "translation-chunk") return;
							if (message.chunkIndex === 1) {
								throw new Error("Queueが途中で切断されました");
							}
							firstSent.push(message);
						},
					},
					"job-partial",
					"context",
				),
			).rejects.toThrow("Queueが途中で切断されました");
			await expect(chunkStates(db, "job-partial")).resolves.toEqual([
				{ chunk_index: 0, status: "ENQUEUED" },
				{ chunk_index: 1, status: "PENDING" },
				{ chunk_index: 2, status: "PENDING" },
			]);

			const retrySent: Array<
				Extract<TranslationQueueMessage, { kind: "translation-chunk" }>
			> = [];
			await startTranslationJob(
				db,
				{
					send: async (message) => {
						if (message.kind === "translation-chunk") retrySent.push(message);
					},
				},
				"job-partial",
				"context",
			);
			expect(firstSent.map((message) => message.chunkIndex)).toEqual([0]);
			expect(retrySent.map((message) => message.chunkIndex)).toEqual([1, 2]);
			await expect(chunkStates(db, "job-partial")).resolves.toEqual([
				{ chunk_index: 0, status: "ENQUEUED" },
				{ chunk_index: 1, status: "ENQUEUED" },
				{ chunk_index: 2, status: "ENQUEUED" },
			]);
		} finally {
			await db.close();
		}
	});

	it("同じchunkの並行claimは一方だけをprovider実行者にする", async () => {
		const db = createSqliteDatabase();
		try {
			await seedTranslationJob(db, { id: "job-claim" });
			await ensureTranslationJobChunks(db, "job-claim", 1);
			const claims = await Promise.all([
				claimTranslationJobChunk(db, "job-claim", 0, "process"),
				claimTranslationJobChunk(db, "job-claim", 0, "process"),
			]);
			expect(claims.filter((claim) => claim.state === "claimed")).toHaveLength(
				1,
			);
			expect(claims.filter((claim) => claim.state === "busy")).toHaveLength(1);
		} finally {
			await db.close();
		}
	});

	it("Workerが途中で落ちても期限切れleaseを再取得できる", async () => {
		const db = createSqliteDatabase();
		try {
			await seedTranslationJob(db, { id: "job-recover" });
			await ensureTranslationJobChunks(db, "job-recover", 1);
			const abandoned = await claimTranslationJobChunk(
				db,
				"job-recover",
				0,
				"process",
			);
			expect(abandoned.state).toBe("claimed");
			await db.run(
				`UPDATE translation_job_chunks
				 SET lease_until = '2000-01-01T00:00:00.000Z'`,
			);
			const recovered = await claimTranslationJobChunk(
				db,
				"job-recover",
				0,
				"process",
			);
			expect(recovered.state).toBe("claimed");
			if (abandoned.state === "claimed" && recovered.state === "claimed") {
				expect(recovered.leaseToken).not.toBe(abandoned.leaseToken);
			}
		} finally {
			await db.close();
		}
	});

	it("並行Queue配信でもproviderを一度だけ呼び、完了claimと進捗を確定する", async () => {
		const db = createSqliteDatabase();
		try {
			await seedTranslationJob(db, { id: "job-provider" });
			let queuedMessage:
				| Extract<TranslationQueueMessage, { kind: "translation-chunk" }>
				| undefined;
			await startTranslationJob(
				db,
				{
					send: async (message) => {
						if (message.kind === "translation-chunk") queuedMessage = message;
					},
				},
				"job-provider",
				"context",
			);
			if (!queuedMessage) throw new Error("chunk messageがありません");

			let providerStarted!: () => void;
			const providerReady = new Promise<void>((resolve) => {
				providerStarted = resolve;
			});
			let releaseProvider!: () => void;
			const providerRelease = new Promise<void>((resolve) => {
				releaseProvider = resolve;
			});
			const fetchImpl = vi.fn(async () => {
				providerStarted();
				await providerRelease;
				return new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content: JSON.stringify([{ number: 0, text: "Translated" }]),
								},
							},
						],
					}),
					{ headers: { "Content-Type": "application/json" } },
				);
			});
			const providerConfig = {
				openaiApiKey: "test-key",
				fetchImpl: fetchImpl as typeof fetch,
			};
			const first = processTranslationChunk(db, queuedMessage, providerConfig);
			await providerReady;
			const second = processTranslationChunk(db, queuedMessage, providerConfig);
			await expect(second).rejects.toBeInstanceOf(TranslationChunkBusyError);
			expect(fetchImpl).toHaveBeenCalledTimes(1);
			releaseProvider();
			await first;
			const job = await db.get<{ status: string; progress: number }>(
				"SELECT status, progress FROM translation_jobs WHERE id = ?",
				["job-provider"],
			);
			expect(job).toEqual({ status: "COMPLETED", progress: 100 });
			await expect(chunkStates(db, "job-provider")).resolves.toEqual([
				{ chunk_index: 0, status: "COMPLETED" },
			]);
		} finally {
			await db.close();
		}
	});
});
