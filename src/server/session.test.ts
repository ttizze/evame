import { describe, expect, test } from "vitest";
import type { SqlExecutor, TursoDatabase } from "../db/turso-types";
import { InvalidInputError, UnauthenticatedError } from "../domain/errors";
import {
	createSession,
	getSessionUser,
	hashSessionToken,
	requireSessionUser,
} from "./session";

function createSessionDb() {
	const sessions: Array<Record<string, string>> = [];
	const db: TursoDatabase = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("FROM sessions AS s")) {
				const tokenHash = String(args[0]);
				const session = sessions.find(
					(value) => value.token_hash === tokenHash,
				);
				if (!session || Date.parse(session.expires_at) <= Date.now())
					return undefined;
				return {
					id: "user-1",
					email: "person@example.com",
					name: "Person",
					expires_at: session.expires_at,
				} as T;
			}
			if (sql.includes("FROM users WHERE id")) {
				return { id: String(args[0]) } as T;
			}
			return undefined;
		},
		async all<T>(_sql: string, _args = []) {
			return [] as T[];
		},
		async run(sql: string, args = []) {
			if (sql.includes("INSERT INTO sessions")) {
				sessions.push({
					id: String(args[0]),
					user_id: String(args[1]),
					token_hash: String(args[2]),
					expires_at: String(args[3]),
				});
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(this);
		},
		async close() {},
	};
	return { db, sessions };
}

describe("Tursoセッション境界", () => {
	test("生トークンではなくSHA-256ハッシュを保存し、有効期限内だけ認証する", async () => {
		const { db, sessions } = createSessionDb();
		const rawToken = "session-secret";
		const session = await createSession(db, {
			id: "session-1",
			userId: "user-1",
			token: rawToken,
			expiresAt: "2099-01-01T00:00:00.000Z",
		});

		expect(session.token).toBe(rawToken);
		expect(sessions[0]?.token_hash).toBe(await hashSessionToken(rawToken));
		expect(sessions[0]?.token_hash).not.toContain(rawToken);
		expect(await getSessionUser(db, rawToken)).toEqual({
			id: "user-1",
			email: "person@example.com",
			name: "Person",
		});
	});

	test("期限切れまたは存在しないトークンを未認証として扱う", async () => {
		const { db } = createSessionDb();
		expect(await getSessionUser(db, "unknown-token")).toBeNull();
		await expect(
			requireSessionUser(db, "unknown-token"),
		).rejects.toBeInstanceOf(UnauthenticatedError);
	});

	test("空トークンと過去の期限を拒否する", async () => {
		const { db } = createSessionDb();
		await expect(
			createSession(db, {
				id: "session-1",
				userId: "user-1",
				token: "",
				expiresAt: "2099-01-01T00:00:00.000Z",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
		await expect(
			createSession(db, {
				id: "session-1",
				userId: "user-1",
				token: "token",
				expiresAt: "2000-01-01T00:00:00.000Z",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
	});
});
