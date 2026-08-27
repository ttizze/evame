import type { Connection, Transaction } from "@tursodatabase/serverless";
import { connect } from "@tursodatabase/serverless";
import { InvalidInputError } from "../domain/errors";
import type {
	RunResult,
	SqlArguments,
	SqlExecutor,
	TursoDatabase,
} from "./turso-types";

type DatabaseConfig = {
	url: string;
	authToken?: string;
};

type RawExecutor =
	| Pick<Connection, "get" | "all" | "run">
	| Pick<Transaction, "get" | "all" | "run">;

function normalizeRunResult(
	result: Awaited<ReturnType<RawExecutor["run"]>>,
): RunResult {
	const changes = result.changes ?? result.rowsAffected ?? 0;
	return {
		changes: typeof changes === "bigint" ? Number(changes) : changes,
		lastInsertRowid: result.lastInsertRowid,
	};
}

function createExecutor(executor: RawExecutor): SqlExecutor {
	return {
		async get<T>(sql: string, args: SqlArguments = []) {
			const row = await executor.get(sql, args);
			return row as T | undefined;
		},
		async all<T>(sql: string, args: SqlArguments = []) {
			const rows = await executor.all(sql, args);
			return rows as T[];
		},
		async run(sql: string, args: SqlArguments = []) {
			return normalizeRunResult(await executor.run(sql, args));
		},
	};
}

export function createDatabase(config: DatabaseConfig): TursoDatabase {
	if (typeof config.url !== "string" || config.url.trim().length === 0) {
		throw new InvalidInputError("TURSO_DATABASE_URL が未設定です");
	}
	if (config.authToken !== undefined && typeof config.authToken !== "string") {
		throw new InvalidInputError("TURSO_AUTH_TOKEN が不正です");
	}

	const connection = connect({
		url: config.url,
		authToken: config.authToken,
	});
	const executor = createExecutor(connection);

	return {
		...executor,
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			const runTransaction = connection.transactionAsync(
				async (transaction: Transaction) => {
					await transaction.run("PRAGMA foreign_keys = ON");
					return callback(createExecutor(transaction));
				},
			);
			return await runTransaction();
		},
		close() {
			return connection.close();
		},
	};
}

export type { DatabaseConfig };
