import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import type { JsonValue } from "@/db/types";
import type { PageComment } from "@/db/types.helpers";
import {
	createPageComment,
	updatePageComment,
	updateParentReplyCount,
} from "./db/mutations.server";

/** ページコメント本文とセグメントを同じトランザクションで upsert する。 */
export async function upsertPageCommentAndSegments(input: {
	pageId: number;
	pageCommentId?: number;
	parentId?: number;
	currentUserId: string;
	sourceLocale: string;
	mdastJson: JsonValue;
	segments: SegmentDraft[];
}) {
	return db.transaction().execute(async (tx) => {
		let pageComment: PageComment;

		if (input.pageCommentId !== undefined) {
			pageComment = await updatePageComment(
				tx,
				input.pageCommentId,
				input.currentUserId,
				input.mdastJson,
				input.sourceLocale,
			);
		} else {
			pageComment = await createPageComment(
				tx,
				input.pageId,
				input.currentUserId,
				input.mdastJson,
				input.sourceLocale,
				input.parentId ?? null,
			);

			if (input.parentId !== undefined) {
				await updateParentReplyCount(tx, input.parentId, pageComment.createdAt);
			}
		}

		await syncSegments(tx, pageComment.id, input.segments, null);
		return pageComment;
	});
}
