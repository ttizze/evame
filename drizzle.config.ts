import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not defined");
}

export default defineConfig({
	schema: "./src/drizzle/schema.ts",
	out: "./src/drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
	verbose: true,
	strict: true,
});
