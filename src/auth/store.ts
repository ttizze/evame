export type UserRecord = {
	id: string;
	email: string;
	name: string;
	created_at: string;
};

export type MagicLinkTokenRecord = {
	id: string;
	email: string;
	token_hash: string;
	expires_at: string;
	used_at: string | null;
	created_at: string;
	request_ip_hash: string;
};

export type SessionRecord = {
	id: string;
	user_id: string;
	token_hash: string;
	expires_at: string;
	created_at: string;
};

/**
 *認証サービスが必要とする最小DB境界。
 *
 * `consumeMagicLinkToken` はDB側で期限と `used_at IS NULL` を同時に判定し、
 * 成功した場合だけ `used_at` を更新する原子的な操作として実装する。
 */
export type AuthStore = {
	findUserByEmail(email: string): Promise<UserRecord | null>;
	findUserById(id: string): Promise<UserRecord | null>;
	createUser(input: UserRecord): Promise<UserRecord>;
	countRecentMagicLinkRequests(input: {
		email: string;
		request_ip_hash: string;
		since: string;
	}): Promise<number>;
	insertMagicLinkToken(record: MagicLinkTokenRecord): Promise<void>;
	consumeMagicLinkToken(input: {
		token_hash: string;
		now: string;
	}): Promise<MagicLinkTokenRecord | null>;
	insertSession(record: SessionRecord): Promise<void>;
	findSessionByTokenHash(input: {
		token_hash: string;
		now: string;
	}): Promise<SessionRecord | null>;
	deleteSessionByTokenHash(token_hash: string): Promise<void>;
};
