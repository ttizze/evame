import type { SqlExecutor } from "@/db/turso-types";
import { fetchPageViewCount as readViewCount } from "@/server/page-interactions";
import { getDatabase } from "@/server/runtime";

/** 公開scriptureの現在の閲覧数を取得する。 */
export function fetchPageViewCount(
	pageId: number,
	database: SqlExecutor = getDatabase(),
): Promise<number> {
	return readViewCount(database, pageId);
}
