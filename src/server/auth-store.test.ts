import { describe, expect, test } from "vitest";
import type { SqlExecutor, TursoDatabase } from "../db/turso-types";
import { createAuthStore } from "./auth-store";

function createAuthDb() {
	const token = {
		id: "magic-1",
		email: "person@example.com",
		token_hash: "hash-1",
		expires_at: "2099-01-01T00:00:00.000Z",
		used_at: null as string | null,
		created_at: "2026-01-01T00:00:00.000Z",
		request_ip_hash: "ip-hash",
	};
	const sessions: Array<Record<string, string>> = [];
	const db: TursoDatabase = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("FROM magic_link_tokens")) {
				if (
					token.token_hash !== args[0] ||
					token.used_at !== null ||
					String(args[1]) >= token.expires_at
				) {
					return undefined;
				}
				return token as T;
			}
			if (sql.includes("FROM sessions")) {
				return (sessions.find((session) => session.token_hash === args[0]) ??
					undefined) as T | undefined;
			}
			return undefined;
		},
		async all<T>(_sql: string, _args = []) {
			return [] as T[];
		},
		async run(sql: string, args = []) {
			if (sql.includes("SET used_at")) {
				if (token.used_at !== null || String(args[2]) >= token.expires_at) {
					return { changes: 0, lastInsertRowid: undefined };
				}
				token.used_at = String(args[0]);
			}
			if (sql.includes("INSERT INTO sessions")) {
				sessions.push({
					id: String(args[0]),
					user_id: String(args[1]),
					token_hash: String(args[2]),
					expires_at: String(args[3]),
					created_at: String(args[4]),
				});
			}
			if (sql.includes("DELETE FROM sessions")) {
				const index = sessions.findIndex(
					(session) => session.token_hash === args[0],
				);
				if (index >= 0) sessions.splice(index, 1);
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(this);
		},
		async close() {},
	};
	return { db, token, sessions };
}

describe("Turso AuthStore", () => {
	test("期限内のmagic linkは一度だけ原子的に消費できる", async () => {
		const { db } = createAuthDb();
		const store = createAuthStore(db);
		const input = { token_hash: "hash-1", now: "2026-01-02T00:00:00.000Z" };

		expect(await store.consumeMagicLinkToken(input)).toMatchObject({
			id: "magic-1",
		});
		expect(await store.consumeMagicLinkToken(input)).toBeNull();
	});

	test("セッションを登録し、token hashで検索・削除できる", async () => {
		const { db, sessions } = createAuthDb();
		const store = createAuthStore(db);
		await store.insertSession({
			id: "session-1",
			user_id: "user-1",
			token_hash: "session-hash",
			expires_at: "2099-01-01T00:00:00.000Z",
			created_at: "2026-01-01T00:00:00.000Z",
		});

		expect(
			await store.findSessionByTokenHash({
				token_hash: "session-hash",
				now: "2026-01-02T00:00:00.000Z",
			}),
		).toMatchObject({ id: "session-1", user_id: "user-1" });
		await store.deleteSessionByTokenHash("session-hash");
		expect(sessions).toHaveLength(0);
	});
});
