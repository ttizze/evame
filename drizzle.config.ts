import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/drizzle/schema.ts",
	out: "./src/drizzle",
	dialect: "turso",
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL || "file:evame.db",
		authToken: process.env.TURSO_AUTH_TOKEN,
	},
	strict: true,
});
