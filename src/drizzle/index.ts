import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzleNeon<typeof schema>>;

export function makeDb(): DrizzleDb {
	const connectionString = process.env.DATABASE_URL || "";
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	return drizzleNeon(connectionString, { schema });
}

export const db = new Proxy({} as DrizzleDb, {
	get(_target, prop: string | symbol) {
		const instance = makeDb();
		const value = instance[prop as keyof DrizzleDb];
		if (typeof value === "function") {
			return value.bind(instance);
		}
		return value;
	},
});
