import { sql } from "kysely";
import { db } from ".";

export function fetchReaderRevision() {
	return db
		.selectFrom("readerRevisions")
		.select("revision")
		.where("key", "=", "*")
		.executeTakeFirstOrThrow();
}

/** DB更新と同時に記録した保留行から、階層の祖先も含む配信依存を取得する。 */
export async function fetchReaderPublicationChanges() {
	return (
		await sql<{ key: string; revision: number }>`
  WITH RECURSIVE navigation(id, revision) AS (
   SELECT CAST(substr(key, 5) AS INTEGER), revision FROM reader_publication_changes WHERE key LIKE 'nav:%'
   UNION SELECT pages.parent_id, navigation.revision FROM pages JOIN navigation ON pages.id = navigation.id WHERE pages.parent_id IS NOT NULL
  ), changes AS (
   SELECT key, revision FROM reader_publication_changes
   UNION SELECT 'tree:' || id, revision FROM navigation
  )
  SELECT key, MAX(revision) AS revision FROM changes GROUP BY key
 `.execute(db)
	).rows;
}
