import { sql } from "kysely";
import { db } from ".";

export function fetchReaderRevision() {
	return db
		.selectFrom("readerRevisions")
		.select("revision")
		.where("key", "=", "*")
		.executeTakeFirstOrThrow();
}

/** 変更された階層だけを親方向へ辿る。移動前の親もDBトリガーが記録する。 */
export async function fetchReaderChanges(since: number) {
	return (
		await sql<{ key: string }>`
  WITH RECURSIVE changed AS (
   SELECT key FROM reader_revisions WHERE revision > ${since} AND key != '*'
  ), navigation(id) AS (
   SELECT CAST(substr(key, 5) AS INTEGER) FROM changed WHERE key LIKE 'nav:%'
   UNION SELECT pages.parent_id FROM pages JOIN navigation ON pages.id = navigation.id WHERE pages.parent_id IS NOT NULL
  )
  SELECT key FROM changed WHERE key NOT LIKE 'nav:%'
  UNION SELECT 'tree:' || id FROM navigation
  UNION SELECT 'about' WHERE EXISTS (SELECT 1 FROM changed)
 `.execute(db)
	).rows;
}

export function fetchReaderCacheInvalidations() {
	return db.selectFrom("readerCacheInvalidations").selectAll().execute();
}
