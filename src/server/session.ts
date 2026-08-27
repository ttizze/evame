import type { SqlExecutor, TursoDatabase, UserRow } from "../db/turso-types";
import { InvalidInputError, UnauthenticatedError } from "../domain/errors";

type SessionUserRow = Pick<UserRow, "id" | "email" | "name"> & {
	expires_at: string;
};

export type AuthenticatedUser = Pick<UserRow, "id" | "email" | "name">;

export type CreateSessionInput = {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date | string;
};

export type SessionCredentials = {
	id: string;
	userId: string;
	token: string;
	expiresAt: string;
};

function assertToken(token: unknown): asserts token is string {
	if (typeof token !== "string" || token.trim().length === 0) {
		throw new InvalidInputError("セッショントークンが不正です");
	}
}

function normalizeId(value: unknown, fieldName: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new InvalidInputError(`${fieldName} が不正です`);
	}
	return value;
}

function normalizeExpiry(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) {
		throw new InvalidInputError("expiresAt が不正です");
	}
	return date.toISOString();
}

function sessionIsActive(expiresAt: unknown): expiresAt is string {
	if (typeof expiresAt !== "string") return false;
	const timestamp = Date.parse(expiresAt);
	return Number.isFinite(timestamp) && timestamp > Date.now();
}

/**
 * セッショントークンの原文はDBへ保存せず、Web CryptoでSHA-256化する。
 * Node専用のcryptoモジュールを使わないため、Workerでも同じコードを使える。
 */
export async function hashSessionToken(token: string): Promise<string> {
	assertToken(token);
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(token),
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

async function findSessionUserByHash(
	db: SqlExecutor,
	tokenHash: string,
): Promise<AuthenticatedUser | null> {
	const row = await db.get<SessionUserRow>(
		`SELECT u.id, u.email, u.name, s.expires_at
		 FROM sessions AS s
		 INNER JOIN users AS u ON u.id = s.user_id
		 WHERE s.token_hash = ?
		 LIMIT 1`,
		[tokenHash],
	);

	if (!row || !sessionIsActive(row.expires_at)) return null;
	return { id: row.id, email: row.email, name: row.name };
}

export async function getSessionUser(
	db: SqlExecutor,
	token: string,
): Promise<AuthenticatedUser | null> {
	const tokenHash = await hashSessionToken(token);
	return findSessionUserByHash(db, tokenHash);
}

export async function requireSessionUser(
	db: SqlExecutor,
	token: string,
): Promise<AuthenticatedUser> {
	const user = await getSessionUser(db, token);
	if (!user) throw new UnauthenticatedError();
	return user;
}

function randomToken(): string {
	const bytes = new Uint8Array(32);
	globalThis.crypto.getRandomValues(bytes);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

/**
 * 認証境界から渡された値を使ってセッションを登録する。
 * 生トークンは呼び出し元へ一度だけ返し、DBにはハッシュだけを保存する。
 */
export async function createSession(
	db: TursoDatabase,
	input: CreateSessionInput,
): Promise<SessionCredentials> {
	const id = normalizeId(input.id, "id");
	const userId = normalizeId(input.userId, "userId");
	assertToken(input.token);
	const expiresAt = normalizeExpiry(input.expiresAt);
	if (Date.parse(expiresAt) <= Date.now()) {
		throw new InvalidInputError("期限切れのセッションは作成できません");
	}

	const user = await db.get<{ id: string }>(
		"SELECT id FROM users WHERE id = ? LIMIT 1",
		[userId],
	);
	if (!user) {
		throw new InvalidInputError(
			"存在しないユーザーのセッションは作成できません",
		);
	}

	const tokenHash = await hashSessionToken(input.token);
	await db.run(
		"INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
		[id, userId, tokenHash, expiresAt],
	);

	return { id, userId, token: input.token, expiresAt };
}

export async function issueSession(
	db: TursoDatabase,
	input: { userId: string; expiresAt: Date | string },
): Promise<SessionCredentials> {
	return createSession(db, {
		id: globalThis.crypto.randomUUID(),
		userId: input.userId,
		token: randomToken(),
		expiresAt: input.expiresAt,
	});
}

export async function requireSessionUserInTransaction(
	db: SqlExecutor,
	tokenHash: string,
): Promise<AuthenticatedUser> {
	const user = await findSessionUserByHash(db, tokenHash);
	if (!user) throw new UnauthenticatedError();
	return user;
}
