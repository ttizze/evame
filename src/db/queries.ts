import { db } from ".";

export function fetchReaderRevision() {
	return db
		.selectFrom("readerRevisions")
		.select("revision")
		.where("key", "=", "*")
		.executeTakeFirstOrThrow();
}
