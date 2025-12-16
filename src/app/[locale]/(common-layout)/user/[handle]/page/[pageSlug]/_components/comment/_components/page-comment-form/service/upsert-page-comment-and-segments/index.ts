import type { Root as MdastRoot } from "mdast";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import {
	createPageComment,
	updatePageComment,
	updateParentReplyCount,
} from "./db/mutations.server";

/**
 * ページコメントとセグメントをupsertする（ユースケースフロー）
 *
 * 処理の流れ:
 * 1. ページコメントを更新または新規作成
 * 2. 親コメントの返信数/最終返信時刻を更新（新規作成の場合のみ）
 * 3. セグメントを同期
 */
export async function upsertPageCommentAndSegments(p: {
	pageId: number;
	pageCommentId?: number;
	parentId?: number;
	currentUserId: string;
	sourceLocale: string;
	mdastJson: MdastRoot;
	segments: SegmentDraft[];
}) {
	return await db.transaction().execute(async (tx) => {
		let pageComment: Awaited<ReturnType<typeof updatePageComment>>;

		if (p.pageCommentId) {
			// 更新
			pageComment = await updatePageComment(
				tx,
				p.pageCommentId,
				p.currentUserId,
				p.mdastJson,
				p.sourceLocale,
			);
		} else {
			// 新規作成
			pageComment = await createPageComment(
				tx,
				p.pageId,
				p.currentUserId,
				p.mdastJson,
				p.sourceLocale,
				p.parentId ?? null,
			);

			// 親の直下返信数/最終返信時刻を更新（直下のみ）
			if (p.parentId) {
				await updateParentReplyCount(tx, p.parentId, pageComment.createdAt);
			}
		}

		// セグメントを同期
		await syncSegments(tx, pageComment.id, p.segments, null);

		return pageComment;
	});
}
