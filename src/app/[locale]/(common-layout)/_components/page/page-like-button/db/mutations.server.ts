import type { TursoDatabase } from "@/db/turso-types";
import { togglePageLike as savePageLike } from "@/server/page-interactions";
import { getDatabase } from "@/server/runtime";

/** 認証済みユーザーのscriptureいいねをトグルする。 */
export function togglePageLike(
	pageId: number,
	currentUserId: string,
	database: TursoDatabase = getDatabase(),
): Promise<{ liked: boolean; likeCount: number }> {
	return savePageLike(database, { pageId, userId: currentUserId });
}
