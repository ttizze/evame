import { describe, expect, test } from "vitest";
import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "../db/turso-types";
import {
	ForbiddenError,
	InvalidInputError,
	NotFoundError,
	UnauthenticatedError,
} from "../domain/errors";
import { hashSessionToken } from "./session";
import {
	createTranslationJob,
	getTranslationJob,
	updateTranslationJob,
} from "./translation-jobs";

function createJobDb(
	options: {
		authenticated?: boolean;
		scriptureExists?: boolean;
		job?: Partial<TranslationJobRow>;
	} = {},
) {
	const token = "job-session";
	const state = {
		job: {
			id: "job-1",
			scripture_id: 7,
			locale: "ja",
			status: "PENDING" as const,
			progress: 0,
			total: 2,
			error: "",
			model: "test-model",
			requested_by: "user-1",
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
			...options.job,
		},
	};
	const db: TursoDatabase = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("FROM sessions AS s")) {
				if (options.authenticated === false) return undefined;
				if (String(args[0]) !== (await hashSessionToken(token)))
					return undefined;
				return {
					id: "user-1",
					email: "user@example.com",
					name: "User",
					expires_at: "2099-01-01T00:00:00.000Z",
				} as T;
			}
			if (sql.includes("SELECT id FROM scriptures")) {
				return options.scriptureExists === false ? undefined : ({ id: 7 } as T);
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
					scripture_id: (args[1] as number | null) ?? null,
					locale: String(args[2]),
					total: Number(args[3]),
					model: String(args[4]),
					requested_by: String(args[5]),
				};
			}
			if (sql.includes("UPDATE translation_jobs")) {
				state.job = {
					...state.job,
					status: args[0] as TranslationJobRow["status"],
					progress: Number(args[1]),
					total: Number(args[2]),
					error: String(args[3]),
				};
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(this);
		},
		async close() {},
	};
	return { db, state, token };
}

describe("翻訳ジョブserver function", () => {
	test("作成したジョブをTEXTのIDで取得・更新できる", async () => {
		const { db, state, token } = createJobDb();
		const created = await createTranslationJob(db, {
			sessionToken: token,
			locale: "ja",
			model: "test-model",
			scriptureId: 7,
			total: 2,
		});

		expect(created.id).toBe(state.job.id);
		expect(typeof created.id).toBe("string");
		expect(
			await getTranslationJob(db, { jobId: created.id, sessionToken: token }),
		).toMatchObject({ id: created.id, requestedBy: "user-1" });
		expect(
			await updateTranslationJob(db, {
				jobId: created.id,
				sessionToken: token,
				status: "COMPLETED",
				progress: 2,
				total: 2,
				error: "",
			}),
		).toMatchObject({ id: created.id, status: "COMPLETED", progress: 2 });
	});

	test("未認証・不存在・所有者違いを拒否する", async () => {
		const unauthenticated = createJobDb({ authenticated: false });
		await expect(
			createTranslationJob(unauthenticated.db, {
				sessionToken: unauthenticated.token,
				locale: "ja",
				model: "test-model",
			}),
		).rejects.toBeInstanceOf(UnauthenticatedError);

		const missing = createJobDb();
		await expect(
			getTranslationJob(missing.db, {
				jobId: "missing",
				sessionToken: missing.token,
			}),
		).rejects.toBeInstanceOf(NotFoundError);

		const otherOwner = createJobDb({ job: { requested_by: "other-user" } });
		await expect(
			getTranslationJob(otherOwner.db, {
				jobId: "job-1",
				sessionToken: otherOwner.token,
			}),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	test("不正なジョブID・経典ID・進捗を拒否する", async () => {
		const { db, token } = createJobDb({ scriptureExists: false });
		await expect(
			getTranslationJob(db, { jobId: " ", sessionToken: token }),
		).rejects.toBeInstanceOf(InvalidInputError);
		await expect(
			createTranslationJob(db, {
				sessionToken: token,
				locale: "ja",
				model: "test-model",
				scriptureId: 99,
			}),
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			createTranslationJob(db, {
				sessionToken: token,
				locale: "eo",
				model: "test-model",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
		await expect(
			updateTranslationJob(db, {
				jobId: "job-1",
				sessionToken: token,
				status: "IN_PROGRESS",
				progress: 3,
				total: 2,
				error: "",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
	});
});
