import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error("TURSO_DATABASE_URL is not defined");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
try {
	await migrate(drizzle(client), { migrationsFolder: "./src/drizzle" });
	if (url.startsWith("file:")) await client.execute("PRAGMA journal_mode=WAL");
	const violations = await client.execute("PRAGMA foreign_key_check");
	if (violations.rows.length)
		throw new Error("Database foreign keys are inconsistent");
	console.log("Turso migrations completed");
} finally {
	client.close();
}
