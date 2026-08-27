import type {
	AuthStore,
	MagicLinkTokenRecord,
	SessionRecord,
	UserRecord,
} from "../auth/store";
import type { SqlExecutor, TursoDatabase } from "../db/turso-types";

type UserDbRow = UserRecord;
type MagicLinkDbRow = MagicLinkTokenRecord;
type SessionDbRow = SessionRecord;

function integerValue(value: unknown): number {
	return typeof value === "bigint" ? Number(value) : Number(value);
}

export function createAuthStore(db: TursoDatabase): AuthStore {
	return {
		async findUserByEmail(email) {
			return (
				(await db.get<UserDbRow>(
					"SELECT id, email, name, created_at FROM users WHERE email = ? LIMIT 1",
					[email],
				)) ?? null
			);
		},
		async findUserById(id) {
			return (
				(await db.get<UserDbRow>(
					"SELECT id, email, name, created_at FROM users WHERE id = ? LIMIT 1",
					[id],
				)) ?? null
			);
		},
		async createUser(input) {
			await db.run(
				"INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
				[input.id, input.email, input.name, input.created_at],
			);
			return input;
		},
		async countRecentMagicLinkRequests({ email, request_ip_hash, since }) {
			const row = await db.get<{ count: number | bigint }>(
				`SELECT COUNT(*) AS count
				 FROM magic_link_tokens
				 WHERE created_at >= ?
				 AND (email = ? OR request_ip_hash = ?)`,
				[since, email, request_ip_hash],
			);
			return integerValue(row?.count ?? 0);
		},
		async insertMagicLinkToken(record) {
			await db.run(
				`INSERT INTO magic_link_tokens
				 (id, email, token_hash, expires_at, used_at, created_at, request_ip_hash)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					record.id,
					record.email,
					record.token_hash,
					record.expires_at,
					record.used_at,
					record.created_at,
					record.request_ip_hash,
				],
			);
		},
		async consumeMagicLinkToken({ token_hash, now }) {
			return db.transaction(async (transaction: SqlExecutor) => {
				const record = await transaction.get<MagicLinkDbRow>(
					`SELECT id, email, token_hash, expires_at, used_at, created_at, request_ip_hash
					 FROM magic_link_tokens
					 WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
					 LIMIT 1`,
					[token_hash, now],
				);
				if (!record) return null;

				const update = await transaction.run(
					`UPDATE magic_link_tokens
					 SET used_at = ?
					 WHERE id = ? AND used_at IS NULL AND expires_at > ?`,
					[now, record.id, now],
				);
				return update.changes === 1 ? record : null;
			});
		},
		async insertSession(record) {
			await db.run(
				`INSERT INTO sessions
				 (id, user_id, token_hash, expires_at, created_at)
				 VALUES (?, ?, ?, ?, ?)`,
				[
					record.id,
					record.user_id,
					record.token_hash,
					record.expires_at,
					record.created_at,
				],
			);
		},
		async findSessionByTokenHash({ token_hash, now }) {
			return (
				(await db.get<SessionDbRow>(
					`SELECT id, user_id, token_hash, expires_at, created_at
					 FROM sessions
					 WHERE token_hash = ? AND expires_at > ?
					 LIMIT 1`,
					[token_hash, now],
				)) ?? null
			);
		},
		async deleteSessionByTokenHash(token_hash) {
			await db.run("DELETE FROM sessions WHERE token_hash = ?", [token_hash]);
		},
	};
}
