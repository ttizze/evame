import "dotenv/config";

import type { Config } from "kysely-codegen";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set for kysely-codegen");
}

const config: Config = {
	dialect: "postgres",
	url: process.env.DATABASE_URL,
	outFile: "src/lib/db/types.ts",
	camelCase: false,
	envFile: ".env",
};

export default config;
