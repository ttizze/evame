import { createDatabase, type DatabaseConfig } from "../db/client";
import type { TursoDatabase } from "../db/turso-types";

let configuredDatabase: TursoDatabase | undefined;

/** 起動時にDBアダプターを注入する。接続設定は呼び出し側で管理する。 */
export function configureDatabase(database: TursoDatabase): void {
	configuredDatabase = database;
}

export function configureDatabaseFromConfig(
	config: DatabaseConfig,
): TursoDatabase {
	const database = createDatabase(config);
	configureDatabase(database);
	return database;
}

export function getDatabase(): TursoDatabase {
	if (!configuredDatabase) {
		throw new Error("データベース接続が設定されていません");
	}
	return configuredDatabase;
}
