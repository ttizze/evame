import { describe, expect, it } from "vitest";
import { hashToken } from "./crypto";
import {
	createAuthService,
	InvalidEmailError,
	InvalidMagicLinkError,
} from "./service";
import type {
	AuthStore,
	MagicLinkTokenRecord,
	SessionRecord,
	UserRecord,
} from "./store";

function createMemoryStore() {
	const users = new Map<string, UserRecord>();
	const tokens = new Map<string, MagicLinkTokenRecord>();
	const sessions = new Map<string, SessionRecord>();

	const store: AuthStore = {
		async findUserByEmail(email) {
			return [...users.values()].find((user) => user.email === email) ?? null;
		},
		async findUserById(id) {
			return users.get(id) ?? null;
		},
		async createUser(input) {
			const user = { ...input };
			users.set(user.id, user);
			return user;
		},
		async countRecentMagicLinkRequests({ email, request_ip_hash, since }) {
			return [...tokens.values()].filter((token) => {
				return (
					token.created_at >= since &&
					(token.email === email || token.request_ip_hash === request_ip_hash)
				);
			}).length;
		},
		async insertMagicLinkToken(record) {
			tokens.set(record.token_hash, { ...record });
		},
		async consumeMagicLinkToken({ token_hash, now }) {
			const record = tokens.get(token_hash);
			if (
				!record ||
				record.used_at !== null ||
				Date.parse(record.expires_at) <= Date.parse(now)
			) {
				return null;
			}
			const snapshot = { ...record };
			record.used_at = now;
			return snapshot;
		},
		async insertSession(record) {
			sessions.set(record.token_hash, { ...record });
		},
		async findSessionByTokenHash({ token_hash, now }) {
			const record = sessions.get(token_hash);
			return record && Date.parse(record.expires_at) > Date.parse(now)
				? { ...record }
				: null;
		},
		async deleteSessionByTokenHash(token_hash) {
			sessions.delete(token_hash);
		},
	};

	return { store, users, tokens, sessions };
}

describe("マジックリンク認証サービス", () => {
	it("未登録メールでもユーザーを作り、トークンハッシュだけを保存する", async () => {
		const memory = createMemoryStore();
		const sent: Array<{ email: string; link: string }> = [];
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async (message) => {
				sent.push(message);
			},
			now: () => new Date("2026-08-27T00:00:00.000Z"),
		});

		const result = await service.requestMagicLink({
			email: " Person@Example.com ",
			requestIp: "203.0.113.10",
			redirectTo: "/vote?scripture=1",
		});

		expect(result).toEqual({ accepted: true });
		expect(memory.users.size).toBe(1);
		expect(sent).toHaveLength(1);
		const link = new URL(sent[0]?.link ?? "");
		const rawToken = link.searchParams.get("token");
		const storedToken = [...memory.tokens.values()][0];
		expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(storedToken?.email).toBe("person@example.com");
		expect(storedToken?.token_hash).toBe(await hashToken(rawToken ?? ""));
		expect(storedToken?.request_ip_hash).toBe(await hashToken("203.0.113.10"));
		expect(storedToken?.token_hash).not.toContain(rawToken ?? "");
		expect(storedToken?.used_at).toBeNull();
	});

	it("登録済みと未登録メールへ同じ成功レスポンスを返す", async () => {
		const memory = createMemoryStore();
		const sent: Array<{ email: string; link: string }> = [];
		let id = 0;
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async (message) => {
				sent.push(message);
			},
			now: () => new Date("2026-08-27T00:00:00.000Z"),
		});

		await service.requestMagicLink({
			email: "known@example.com",
			requestIp: `198.51.100.${++id}`,
		});
		const known = await service.requestMagicLink({
			email: "known@example.com",
			requestIp: `198.51.100.${++id}`,
		});
		const unknown = await service.requestMagicLink({
			email: "new@example.com",
			requestIp: `198.51.100.${++id}`,
		});

		expect(known).toEqual(unknown);
		expect(sent.map((message) => message.email)).toEqual([
			"known@example.com",
			"known@example.com",
			"new@example.com",
		]);
	});

	it("メールとIP単位のレート制限を超えても存在有無を返さず送信しない", async () => {
		const memory = createMemoryStore();
		const sent: Array<{ email: string; link: string }> = [];
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async (message) => {
				sent.push(message);
			},
			maxRequestsPerWindow: 2,
			now: () => new Date("2026-08-27T00:00:00.000Z"),
		});

		const first = await service.requestMagicLink({
			email: "one@example.com",
			requestIp: "192.0.2.1",
		});
		const second = await service.requestMagicLink({
			email: "two@example.com",
			requestIp: "192.0.2.1",
		});
		const third = await service.requestMagicLink({
			email: "never@example.com",
			requestIp: "192.0.2.1",
		});

		expect(first).toEqual(second);
		expect(second).toEqual(third);
		expect(sent).toHaveLength(2);
		expect(memory.users.has("never@example.com")).toBe(false);
	});

	it("期限内のトークンを一度だけ検証し、ハッシュ化セッションCookie値を返す", async () => {
		const memory = createMemoryStore();
		const current = new Date("2026-08-27T00:00:00.000Z");
		const sent: Array<{ email: string; link: string }> = [];
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async (message) => {
				sent.push(message);
			},
			now: () => current,
		});

		await service.requestMagicLink({
			email: "person@example.com",
			requestIp: "203.0.113.20",
			redirectTo: "/vote",
		});
		const rawToken =
			new URL(sent[0]?.link ?? "").searchParams.get("token") ?? "";
		const result = await service.verifyMagicLink({
			token: rawToken,
			redirectTo: "/vote",
		});

		expect(result.redirectPath).toBe("/vote");
		expect(result.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(result.sessionMaxAgeSeconds).toBe(60 * 60 * 24 * 7);
		const storedSession = [...memory.sessions.values()][0];
		expect(storedSession?.user_id).toBe([...memory.users.values()][0]?.id);
		expect(storedSession?.token_hash).toBe(
			await hashToken(result.sessionToken),
		);
		expect(storedSession?.token_hash).not.toContain(result.sessionToken);

		await expect(
			service.verifyMagicLink({ token: rawToken, redirectTo: "/vote" }),
		).rejects.toBeInstanceOf(InvalidMagicLinkError);
	});

	it("期限切れトークンを検証せずセッションも発行しない", async () => {
		const memory = createMemoryStore();
		let current = new Date("2026-08-27T00:00:00.000Z");
		const sent: Array<{ email: string; link: string }> = [];
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async (message) => {
				sent.push(message);
			},
			tokenTtlMs: 1_000,
			now: () => current,
		});

		await service.requestMagicLink({
			email: "person@example.com",
			requestIp: "203.0.113.21",
		});
		const rawToken =
			new URL(sent[0]?.link ?? "").searchParams.get("token") ?? "";
		current = new Date("2026-08-27T00:00:01.001Z");

		await expect(
			service.verifyMagicLink({ token: rawToken }),
		).rejects.toBeInstanceOf(InvalidMagicLinkError);
		expect(memory.sessions.size).toBe(0);
	});

	it("不正なメールアドレスを受け付けない", async () => {
		const memory = createMemoryStore();
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async () => undefined,
		});

		await expect(
			service.requestMagicLink({
				email: "not-an-email",
				requestIp: "203.0.113.1",
			}),
		).rejects.toBeInstanceOf(InvalidEmailError);
	});

	it("ログアウトでセッションを削除する", async () => {
		const memory = createMemoryStore();
		let current = new Date("2026-08-27T00:00:00.000Z");
		const sent: Array<{ email: string; link: string }> = [];
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async (message) => {
				sent.push(message);
			},
			now: () => current,
		});

		await service.requestMagicLink({
			email: "person@example.com",
			requestIp: "203.0.113.22",
		});
		const token = new URL(sent[0]?.link ?? "").searchParams.get("token") ?? "";
		const session = await service.verifyMagicLink({ token });
		expect(
			await service.authenticateSession(session.sessionToken),
		).not.toBeNull();

		await service.logout(session.sessionToken);

		expect(await service.authenticateSession(session.sessionToken)).toBeNull();
		current = new Date("2026-08-27T00:00:01.000Z");
	});

	it("期限が解釈できないセッションを認証しない", async () => {
		const memory = createMemoryStore();
		const service = createAuthService({
			store: memory.store,
			publicOrigin: "https://evame.example",
			sendMagicLink: async () => undefined,
		});
		const sessionToken = "session-token";
		const tokenHash = await hashToken(sessionToken);
		const user: UserRecord = {
			id: "user-1",
			email: "person@example.com",
			name: "Anonymous",
			created_at: "2026-08-27T00:00:00.000Z",
		};
		memory.users.set(user.id, user);
		memory.sessions.set(tokenHash, {
			id: "session-1",
			user_id: user.id,
			token_hash: tokenHash,
			expires_at: "not-a-date",
			created_at: user.created_at,
		});

		expect(await service.authenticateSession(sessionToken)).toBeNull();
	});
});
