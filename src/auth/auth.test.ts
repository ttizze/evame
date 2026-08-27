import { describe, expect, it, vi } from "vitest";
import type { RunResult, SqlArguments, TursoDatabase } from "@/db/turso-types";
import { createAuth } from "./auth";
import { handleAuthRequest } from "./handler";

type StoredRow = Record<string, unknown>;

class InMemoryAuthDatabase implements TursoDatabase {
	private readonly tables = new Map<string, StoredRow[]>();

	rows(table: string): StoredRow[] {
		return this.tables.get(table)?.map((row) => ({ ...row })) ?? [];
	}

	async get<T>(sql: string, args: SqlArguments = []): Promise<T | undefined> {
		return (await this.all<T>(sql, args))[0];
	}

	async all<T>(sql: string, args: SqlArguments = []): Promise<T[]> {
		const normalized = sql.replace(/\s+/gu, " ").trim();
		const table = this.tableName(normalized);
		const sourceRows = this.tables.get(table) ?? [];
		const where = normalized.match(
			/\sWHERE\s(.+?)(?=\sORDER BY\s|\sLIMIT\s|$)/iu,
		)?.[1];
		const whereArgs = this.whereArgs(where, args);
		const rows = sourceRows.filter((row) =>
			where ? this.matches(row, where, whereArgs) : true,
		);

		const order = normalized.match(
			/\sORDER BY\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(ASC|DESC)/iu,
		);
		if (order) {
			const column = order[1] ?? "";
			const descending = order[2]?.toUpperCase() === "DESC";
			rows.sort((left, right) => {
				const leftValue = String(left[column] ?? "");
				const rightValue = String(right[column] ?? "");
				return descending
					? rightValue.localeCompare(leftValue)
					: leftValue.localeCompare(rightValue);
			});
		}

		const limit = this.limit(normalized, args, whereArgs.length);
		const paged = rows.slice(limit.offset, limit.offset + limit.count);
		if (/^SELECT\s+COUNT\(\*\)/iu.test(normalized)) {
			return [{ count: rows.length } as T];
		}
		const selection = normalized.match(/^SELECT\s+(.+?)\s+FROM\s/iu)?.[1];
		if (!selection || selection === "*")
			return paged.map((row) => ({ ...row }) as T);
		const columns = selection
			.split(",")
			.map((column) => column.trim().replace(/^"|"$/gu, ""));
		return paged.map((row) => {
			const selected: StoredRow = {};
			for (const column of columns) selected[column] = row[column];
			return selected as T;
		});
	}

	async run(sql: string, args: SqlArguments = []): Promise<RunResult> {
		const normalized = sql.replace(/\s+/gu, " ").trim();
		if (/^INSERT INTO\s/iu.test(normalized)) {
			const match = normalized.match(
				/^INSERT INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(([^)]+)\)\s+VALUES\s*\(([^)]+)\)/iu,
			);
			if (!match) throw new Error(`未対応のINSERT: ${normalized}`);
			const table = match[1] ?? "";
			const columns = (match[2] ?? "")
				.split(",")
				.map((column) => column.trim().replace(/^"|"$/gu, ""));
			const row: StoredRow = {};
			for (const [index, column] of columns.entries())
				row[column] = args[index];
			const rows = this.tables.get(table) ?? [];
			rows.push(row);
			this.tables.set(table, rows);
			return { changes: 1, lastInsertRowid: undefined };
		}

		if (/^UPDATE\s/iu.test(normalized)) {
			const match = normalized.match(
				/^UPDATE\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s+SET\s+(.+?)(?=\sWHERE\s|$)(?:\sWHERE\s(.+))?$/iu,
			);
			if (!match) throw new Error(`未対応のUPDATE: ${normalized}`);
			const table = match[1] ?? "";
			const assignments = [
				...(match[2] ?? "").matchAll(/"?([A-Za-z_][A-Za-z0-9_]*)"?\s*=\s*\?/gu),
			].map(([, column]) => column ?? "");
			const where = match[3];
			const whereArgs = this.whereArgs(where, args.slice(assignments.length));
			let changes = 0;
			for (const row of this.tables.get(table) ?? []) {
				if (where && !this.matches(row, where, whereArgs)) continue;
				for (const [index, column] of assignments.entries())
					row[column] = args[index];
				changes += 1;
			}
			return { changes, lastInsertRowid: undefined };
		}

		if (/^DELETE FROM\s/iu.test(normalized)) {
			const match = normalized.match(
				/^DELETE FROM\s+"?([A-Za-z_][A-Za-z0-9_]*)"?(?:\sWHERE\s(.+))?$/iu,
			);
			if (!match) throw new Error(`未対応のDELETE: ${normalized}`);
			const table = match[1] ?? "";
			const where = match[2];
			const rows = this.tables.get(table) ?? [];
			const whereArgs = this.whereArgs(where, args);
			const kept = where
				? rows.filter((row) => !this.matches(row, where, whereArgs))
				: [];
			this.tables.set(table, kept);
			return { changes: rows.length - kept.length, lastInsertRowid: undefined };
		}

		throw new Error(`未対応のSQL: ${normalized}`);
	}

	async transaction<T>(
		callback: (transaction: TursoDatabase) => Promise<T>,
	): Promise<T> {
		return callback(this);
	}

	async close(): Promise<void> {}

	private tableName(sql: string): string {
		return sql.match(/\sFROM\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/iu)?.[1] ?? "";
	}

	private whereArgs(
		where: string | undefined,
		args: SqlArguments,
	): SqlArguments {
		if (!where) return [];
		const placeholders = where.match(/\?/gu)?.length ?? 0;
		return args.slice(0, placeholders);
	}

	private matches(row: StoredRow, where: string, args: SqlArguments): boolean {
		let index = 0;
		const conditions = [
			...where.matchAll(
				/\(?\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*(=|<>|<=|>=|<|>|IS\s+NOT\s+NULL|IS\s+NULL)\s*(\?|$)/giu,
			),
		];
		return conditions.every(([, column, operator]) => {
			const value = row[column ?? ""];
			const normalizedOperator = operator?.replace(/\s+/gu, " ").toUpperCase();
			if (normalizedOperator === "IS NULL")
				return value === null || value === undefined;
			if (normalizedOperator === "IS NOT NULL")
				return value !== null && value !== undefined;
			const expected = args[index++];
			if (normalizedOperator === "=") return String(value) === String(expected);
			if (normalizedOperator === "<>")
				return String(value) !== String(expected);
			const left = String(value ?? "");
			const right = String(expected ?? "");
			if (normalizedOperator === "<") return left < right;
			if (normalizedOperator === "<=") return left <= right;
			if (normalizedOperator === ">") return left > right;
			if (normalizedOperator === ">=") return left >= right;
			return false;
		});
	}

	private limit(
		sql: string,
		args: SqlArguments,
		whereArgumentCount: number,
	): { count: number; offset: number } {
		const match = sql.match(/\sLIMIT\s+(\?|\d+)(?:\s+OFFSET\s+(\?|\d+))?/iu);
		if (!match) return { count: Number.MAX_SAFE_INTEGER, offset: 0 };
		const count =
			match[1] === "?" ? Number(args[whereArgumentCount]) : Number(match[1]);
		const offset = match[2]
			? match[2] === "?"
				? Number(args[whereArgumentCount + 1])
				: Number(match[2])
			: 0;
		return {
			count: Number.isFinite(count) ? count : 100,
			offset: Number.isFinite(offset) ? offset : 0,
		};
	}
}

function database(): TursoDatabase {
	return {
		async get() {
			return undefined;
		},
		async all() {
			return [];
		},
		async run() {
			return { changes: 0, lastInsertRowid: undefined };
		},
		async transaction(callback) {
			return callback(this);
		},
		async close() {},
	};
}

const secret = "a".repeat(32);

describe("Better Auth設定", () => {
	it("Google providerとMagic Linkを同じ認証インスタンスへ登録する", () => {
		const auth = createAuth({
			database: database(),
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
			resend: {
				apiKey: "resend-key",
				from: "Digital Buddhism <noreply@example.com>",
			},
		});

		expect(auth.options.socialProviders?.google).toBeDefined();
		expect(auth.options.plugins?.map((plugin) => plugin.id)).toEqual([
			"magic-link",
			"custom-session",
			"tanstack-start-cookies",
		]);
		expect(auth.options.advanced?.cookies?.session_token).toMatchObject({
			name: "digital_buddhism_session",
			attributes: {
				httpOnly: true,
				secure: true,
				sameSite: "lax",
			},
		});
	});

	it("認証ログは任意のmessageや引数を捨て、固定イベントだけを出力する", () => {
		const auth = createAuth({
			database: database(),
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			const logger = auth.options.logger;
			expect(logger).toMatchObject({
				level: "warn",
				disableColors: true,
			});
			logger?.log?.(
				"error",
				"raw token, email, callback query, stack and message",
				{
					token: "session-token",
					email: "person@example.com",
					where: "token = ?",
					providerResponse: "provider-secret",
					stack: "secret stack",
				},
			);
			logger?.log?.("warn", "another secret message", {
				secret: "auth-secret",
			});

			expect(error.mock.calls).toEqual([["auth.error"]]);
			expect(warn.mock.calls).toEqual([["auth.warning"]]);
		} finally {
			error.mockRestore();
			warn.mockRestore();
		}
	});

	it("Magic Link endpointからcustom Turso adapterとResend送信を通過する", async () => {
		const writes: Array<{ sql: string; args: SqlArguments }> = [];
		const sent: Array<{ email: string; html: string }> = [];
		const db: TursoDatabase = {
			...database(),
			async run(sql, args = []) {
				writes.push({ sql, args });
				return { changes: 1, lastInsertRowid: undefined };
			},
		};
		const auth = createAuth({
			database: db,
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
			resend: {
				apiKey: "resend-key",
				from: "Digital Buddhism <noreply@example.com>",
			},
			fetchImpl: async (_url, init) => {
				const body = JSON.parse(String(init?.body)) as {
					to: string[];
					html: string;
				};
				sent.push({ email: body.to[0] ?? "", html: body.html });
				return new Response(null, { status: 200 });
			},
		});

		await expect(
			auth.api.signInMagicLink({
				body: { email: "person@example.com", callbackURL: "/" },
				headers: new Headers(),
			}),
		).resolves.toEqual({ status: true });

		const verificationWrite = writes.find((write) =>
			write.sql.includes('INSERT INTO "verifications"'),
		);
		const storedIdentifier = verificationWrite?.args[0];
		expect(storedIdentifier).toMatch(/^[0-9a-f]{64}$/u);
		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({ email: "person@example.com" });
		expect(sent[0]?.html).toContain("/api/auth/magic-link/verify?token=");
		expect(sent[0]?.html).not.toContain(String(storedIdentifier));
	});

	it("発行したMagic Linkを検証し、署名Cookieから同じユーザーを取得する", async () => {
		const database = new InMemoryAuthDatabase();
		const sent: string[] = [];
		const auth = createAuth({
			database,
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
			resend: {
				apiKey: "resend-key",
				from: "Digital Buddhism <noreply@example.com>",
			},
			fetchImpl: async (_url, init) => {
				const body = JSON.parse(String(init?.body)) as { html: string };
				sent.push(body.html);
				return new Response(null, { status: 200 });
			},
		});

		await auth.api.signInMagicLink({
			body: { email: "Person@Example.com", callbackURL: "/" },
			headers: new Headers({ origin: "https://example.com" }),
		});
		const html = sent[0];
		const link = html?.match(/href="([^"]+)"/u)?.[1]?.replaceAll("&amp;", "&");
		expect(link).toBeDefined();

		const verifyResponse = await auth.handler(
			new Request(link as string, {
				headers: { origin: "https://example.com" },
			}),
		);
		expect(verifyResponse.status).toBe(302);
		const setCookie = verifyResponse.headers.get("set-cookie") ?? "";
		const cookiePair = setCookie.match(
			/(digital_buddhism_session=[^;]+)/u,
		)?.[1];
		expect(setCookie).toMatch(
			/digital_buddhism_session=[^;]+; Max-Age=604800; Path=\/; HttpOnly; Secure; SameSite=Lax/u,
		);
		expect(cookiePair).toMatch(/digital_buddhism_session=[^.]+\.[^.]+/u);
		expect(database.rows("users")).toHaveLength(1);
		expect(database.rows("accounts")).toHaveLength(0);
		expect(database.rows("sessions")).toHaveLength(1);
		expect(database.rows("verifications")).toHaveLength(1);

		const session = await auth.api.getSession({
			headers: new Headers({ cookie: cookiePair as string }),
		});
		expect(session?.user).toMatchObject({
			email: "person@example.com",
			emailVerified: true,
			isAi: false,
			totalPoints: 0,
		});
		expect(session?.user.id).toBe(database.rows("users")[0]?.id);
		expect(session?.session.token).toBe(database.rows("sessions")[0]?.token);

		const reusedResponse = await auth.handler(
			new Request(link as string, {
				headers: { origin: "https://example.com" },
			}),
		);
		expect(reusedResponse.status).toBe(302);
		expect(reusedResponse.headers.get("location")).toContain(
			"error=ATTEMPTS_EXCEEDED",
		);
		expect(database.rows("verifications")).toHaveLength(0);
	});

	it("Magic Linkの外部callbackURLをBetter Auth handlerで拒否する", async () => {
		const database = new InMemoryAuthDatabase();
		const sent: string[] = [];
		const auth = createAuth({
			database,
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
			resend: {
				apiKey: "resend-key",
				from: "Digital Buddhism <noreply@example.com>",
			},
			fetchImpl: async (_url, init) => {
				const body = JSON.parse(String(init?.body)) as { html: string };
				sent.push(body.html);
				return new Response(null, { status: 200 });
			},
		});

		await auth.api.signInMagicLink({
			body: { email: "person@example.com", callbackURL: "/" },
			headers: new Headers({ origin: "https://example.com" }),
		});
		const link = sent[0]
			?.match(/href="([^"]+)"/u)?.[1]
			?.replaceAll("&amp;", "&");
		expect(link).toBeDefined();
		const externalLink = new URL(link as string);
		externalLink.searchParams.set("callbackURL", "https://evil.example/steal");
		const response = await handleAuthRequest(
			new Request(externalLink, {
				headers: { origin: "https://example.com" },
			}),
			auth,
		);
		expect(response.status).toBe(400);
		const location = response.headers.get("location");
		expect(location).toBeNull();
		expect(database.rows("users")).toHaveLength(0);
		expect(database.rows("sessions")).toHaveLength(0);
		expect(database.rows("verifications")).toHaveLength(1);
		expect(await response.json()).toMatchObject({
			code: "INVALID_CALLBACK_URL",
		});
	});

	it("Googleログイン開始時にstateとPKCE付きの認証URLを生成する", async () => {
		const auth = createAuth({
			database: new InMemoryAuthDatabase(),
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
		});

		const response = await auth.handler(
			new Request("https://example.com/api/auth/sign-in/social", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "https://example.com",
				},
				body: JSON.stringify({ provider: "google", callbackURL: "/" }),
			}),
		);
		const body = (await response.json()) as {
			url?: string;
			redirect?: boolean;
		};
		const authorizationURL = new URL(body.url as string);
		expect(response.status).toBe(200);
		expect(body.redirect).toBe(true);
		expect(authorizationURL.origin).toBe("https://accounts.google.com");
		expect(authorizationURL.searchParams.get("state")).toMatch(/.+/u);
		expect(authorizationURL.searchParams.get("code_challenge")).toMatch(/.+/u);
		expect(authorizationURL.searchParams.get("code_challenge_method")).toBe(
			"S256",
		);
	});

	it("秘密値を空のまま認証インスタンスへ渡さない", () => {
		expect(() =>
			createAuth({
				database: database(),
				baseURL: "https://example.com",
				secret: "",
				google: { clientId: "google-client", clientSecret: "google-secret" },
			}),
		).toThrow("認証シークレットが設定されていません");
	});

	it("Google OAuthの設定不足を起動時に明確に拒否する", () => {
		expect(() =>
			createAuth({
				database: database(),
				baseURL: "https://example.com",
				secret,
				google: { clientId: "", clientSecret: "google-secret" },
			}),
		).toThrow("Google認証の設定が不完全です");
	});

	it("Resend設定不足をMagic Link初回リクエストで明確に拒否する", async () => {
		const auth = createAuth({
			database: database(),
			baseURL: "https://example.com",
			secret,
			google: { clientId: "google-client", clientSecret: "google-secret" },
		});

		await expect(
			auth.api.signInMagicLink({
				body: { email: "person@example.com", callbackURL: "/" },
				headers: new Headers({ origin: "https://example.com" }),
			}),
		).rejects.toThrow("メール送信が設定されていません");
	});

	it("許可されていない認証ベースURLを拒否する", () => {
		expect(() =>
			createAuth({
				database: database(),
				baseURL: "javascript:alert(1)",
				secret,
				google: { clientId: "google-client", clientSecret: "google-secret" },
			}),
		).toThrow("認証のベースURLが不正です");
	});
});
