import type { Transaction } from "kysely";
import { db } from "./index";
import type { DB } from "./types";

/** SQLiteの書き込み競合で中断された場合のみ、DB操作全体を再実行する。外部I/Oを含めない。 */
export async function runTransaction<T>(
	operation: (tx: Transaction<DB>) => Promise<T>,
): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await db.transaction().execute(operation);
		} catch (error) {
			if (
				attempt >= 7 ||
				!(error instanceof Error) ||
				!("code" in error) ||
				![
					"SQLITE_BUSY",
					"SQLITE_BUSY_SNAPSHOT",
					"SQLITE_LOCKED",
					"TRANSACTION_ACTIVE",
				].includes(String(error.code))
			)
				throw error;
			await new Promise((resolve) =>
				setTimeout(resolve, 25 * 2 ** attempt + Math.random() * 25),
			);
		}
	}
}
