import { createClient } from "@libsql/client";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { CamelCasePlugin, type ColumnType, Kysely } from "kysely";
import { afterEach, describe, expect, it } from "vitest";
import { TursoValueCodecPlugin } from "./turso-value-codec";

type TestDatabase = {
	pages: {
		id: number;
		createdAt: ColumnType<Date, Date | string, Date | string>;
		mdastJson: unknown;
	};
	translationContexts: {
		id: number;
		value: string;
	};
	users: {
		id: string;
		isAi: boolean;
		emailVerified: boolean | null;
	};
	userSettings: {
		id: number;
		userId: string;
		targetLocales: string[];
	};
	sessions: {
		id: string;
		userId: string;
		token: string;
		expiresAt: Date | string;
		createdAt: Date | string;
		updatedAt: Date | string;
	};
};

const clients: Array<ReturnType<typeof createClient>> = [];

afterEach(() => {
	for (const client of clients.splice(0)) client.close();
});

describe("Tursoの値codec", () => {
	it("Date・boolean・JSON・string[]をSQLiteの値と相互変換する", async () => {
		const client = createClient({ url: "file::memory:" });
		clients.push(client);
		await client.batch([
			"CREATE TABLE pages (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, mdast_json TEXT NOT NULL)",
			"CREATE TABLE users (id TEXT PRIMARY KEY, is_ai INTEGER NOT NULL, email_verified INTEGER)",
			"CREATE TABLE user_settings (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, target_locales TEXT NOT NULL)",
			"CREATE TABLE translation_contexts (id INTEGER PRIMARY KEY, value TEXT NOT NULL)",
		]);

		const db = new Kysely<TestDatabase>({
			dialect: new LibsqlDialect({
				client:
					client as unknown as import("@libsql/kysely-libsql").libsql.Client,
			}),
			plugins: [new CamelCasePlugin(), new TursoValueCodecPlugin()],
		});
		const createdAt = new Date("2026-08-29T00:00:00.123Z");
		const mdastJson = {
			type: "root",
			children: [{ type: "text", value: "本文" }],
		};

		await db
			.insertInto("pages")
			.values({ id: 1, createdAt, mdastJson })
			.execute();
		await db
			.insertInto("users")
			.values({ id: "u1", isAi: true, emailVerified: false })
			.execute();
		await db
			.insertInto("userSettings")
			.values({ id: 1, userId: "u1", targetLocales: ["ja", "en"] })
			.execute();
		await db
			.insertInto("translationContexts")
			.values({ id: 1, value: '{"これは":"JSON風の通常文字列"}' })
			.execute();

		const raw = await client.execute(
			"SELECT created_at, mdast_json FROM pages WHERE id = 1",
		);
		const rawUser = await client.execute(
			"SELECT is_ai, email_verified FROM users WHERE id = 'u1'",
		);
		expect(typeof raw.rows[0]?.created_at).toBe("number");
		expect(raw.rows[0]?.mdast_json).toBe(JSON.stringify(mdastJson));
		expect(rawUser.rows[0]).toMatchObject({ is_ai: 1, email_verified: 0 });

		const page = await db
			.selectFrom("pages")
			.select(["createdAt", "mdastJson"])
			.where("id", "=", 1)
			.executeTakeFirstOrThrow();
		const user = await db
			.selectFrom("users")
			.selectAll()
			.where("id", "=", "u1")
			.executeTakeFirstOrThrow();
		const settings = await db
			.selectFrom("userSettings")
			.selectAll()
			.where("id", "=", 1)
			.executeTakeFirstOrThrow();
		const metadata = await db
			.selectFrom("translationContexts")
			.selectAll()
			.where("id", "=", 1)
			.executeTakeFirstOrThrow();

		expect(page).toEqual({ createdAt, mdastJson });
		expect(user).toEqual({ id: "u1", isAi: true, emailVerified: false });
		expect(settings).toEqual({
			id: 1,
			userId: "u1",
			targetLocales: ["ja", "en"],
		});
		expect(metadata.value).toBe('{"これは":"JSON風の通常文字列"}');

		const updatedAt = new Date("2026-08-30T00:00:00.456Z");
		const updatedBody = { type: "root", children: [] };
		await db
			.updateTable("pages")
			.set({ createdAt: updatedAt, mdastJson: updatedBody })
			.where("id", "=", 1)
			.execute();
		await db
			.updateTable("users")
			.set({ isAi: false, emailVerified: true })
			.where("id", "=", "u1")
			.execute();
		await db
			.updateTable("userSettings")
			.set({ targetLocales: ["zh"] })
			.where("id", "=", 1)
			.execute();

		const conflictBody = {
			type: "root",
			children: [{ type: "thematicBreak" }],
		};
		await db
			.insertInto("pages")
			.values({ id: 1, createdAt: updatedAt, mdastJson: updatedBody })
			.onConflict((oc) =>
				oc.column("id").doUpdateSet({ mdastJson: conflictBody }),
			)
			.execute();

		await expect(
			db
				.selectFrom("pages")
				.select(["createdAt", "mdastJson"])
				.where("id", "=", 1)
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({ createdAt: updatedAt, mdastJson: conflictBody });
		await expect(
			db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", "u1")
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({ id: "u1", isAi: false, emailVerified: true });
		await expect(
			db
				.selectFrom("userSettings")
				.selectAll()
				.where("id", "=", 1)
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({ id: 1, userId: "u1", targetLocales: ["zh"] });

		await db.destroy();
	});

	it("ISO文字列化された認証日時をepoch msで保存し既存epoch日時と比較する", async () => {
		const client = createClient({ url: "file::memory:" });
		clients.push(client);
		await client.execute(
			"CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
		);

		const db = new Kysely<TestDatabase>({
			dialect: new LibsqlDialect({
				client:
					client as unknown as import("@libsql/kysely-libsql").libsql.Client,
			}),
			plugins: [new CamelCasePlugin(), new TursoValueCodecPlugin()],
		});
		const now = new Date("2026-08-29T00:00:00.000Z");
		const expiresAt = new Date("2026-08-30T00:00:00.123Z");

		await db
			.insertInto("sessions")
			.values({
				id: "new-session",
				userId: "u1",
				token: "new-token",
				expiresAt: expiresAt.toISOString(),
				createdAt: now.toISOString(),
				updatedAt: now.toISOString(),
			})
			.execute();
		await client.execute({
			sql: "INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
			args: [
				"migrated-session",
				"u1",
				"migrated-token",
				expiresAt.getTime(),
				now.getTime(),
				now.getTime(),
			],
		});

		const raw = await client.execute(
			"SELECT typeof(expires_at) AS expires_type, expires_at, typeof(created_at) AS created_type, typeof(updated_at) AS updated_type FROM sessions WHERE id = 'new-session'",
		);
		expect(raw.rows[0]).toMatchObject({
			expires_type: "integer",
			expires_at: expiresAt.getTime(),
			created_type: "integer",
			updated_type: "integer",
		});

		const activeSessions = await db
			.selectFrom("sessions")
			.select(["id", "expiresAt"])
			.where("expiresAt", ">", now.toISOString())
			.orderBy("id")
			.execute();
		expect(activeSessions).toEqual([
			{ id: "migrated-session", expiresAt },
			{ id: "new-session", expiresAt },
		]);

		await db.destroy();
	});
});
