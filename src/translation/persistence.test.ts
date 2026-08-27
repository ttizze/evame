import { describe, expect, it } from "vitest";
import type { SqlExecutor, TursoDatabase } from "@/db/turso-types";
import { InvalidInputError, NotFoundError } from "@/domain/errors";
import { mapTranslationJob, saveAiTranslations } from "./persistence";

describe("翻訳ジョブ行の永続化境界", () => {
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
			}),
		).toMatchObject({
			id: "job-abc",
			scriptureId: 42,
			requestedBy: null,
		});
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
				requestedBy: "user-1",
				translations: [{ number: 0, text: "訳文" }],
				segments: [{ id: 7, number: 0, text: "source" }],
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});
