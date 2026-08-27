import type { TursoDatabase } from "@/db/turso-types";
import { incrementPageView as savePageView } from "@/server/page-interactions";
import { getDatabase } from "@/server/runtime";

/** 公開scriptureの閲覧数を原子的に1増やす。 */
export function incrementPageView(
	pageId: number,
	database: TursoDatabase = getDatabase(),
): Promise<number> {
	return savePageView(database, pageId);
}
