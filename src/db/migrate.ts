import { createDatabase } from "./client";
import { migrateDatabase } from "./migrations";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
	throw new Error("TURSO_DATABASE_URL が未設定です");
}

const database = createDatabase({ url, authToken });
try {
	await migrateDatabase(database);
} finally {
	await database.close();
}
