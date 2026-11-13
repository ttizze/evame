import { sql } from "kysely";
import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { db } from "@/db";

// 一覧と未読件数で、参照先が存在する通知の条件を共有する。
function notificationRows(currentUserHandle: string) {
	const pageId = sql<number | null>`case
		when ${sql.ref("n.type")} = 'PAGE_LIKE' then ${sql.ref("n.pageId")}
		when ${sql.ref("n.type")} = 'PAGE_COMMENT' then (
			select ${sql.ref("pc.pageId")} from ${sql.table("pageComments")} pc where ${sql.ref("pc.id")} = ${sql.ref("n.pageCommentId")}
		)
		when ${sql.ref("n.type")} = 'PAGE_SEGMENT_TRANSLATION_VOTE' then (
			select ${sql.ref("s.contentId")} from ${sql.table("segmentTranslations")} st
			join ${sql.table("segments")} s on ${sql.ref("s.id")} = ${sql.ref("st.segmentId")}
			where ${sql.ref("st.id")} = ${sql.ref("n.segmentTranslationId")}
		)
		when ${sql.ref("n.type")} = 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE' then (
			select ${sql.ref("pc.pageId")} from ${sql.table("segmentTranslations")} st
			join ${sql.table("segments")} s on ${sql.ref("s.id")} = ${sql.ref("st.segmentId")}
			join ${sql.table("pageComments")} pc on ${sql.ref("pc.id")} = ${sql.ref("s.contentId")}
			where ${sql.ref("st.id")} = ${sql.ref("n.segmentTranslationId")}
		)
		else null end`;
	return db
		.selectFrom("notifications as n")
		.innerJoin("users as recipient", "recipient.id", "n.userId")
		.innerJoin("users as actor", "actor.id", "n.actorId")
		.leftJoin("pages as page", (join) =>
			join.on(sql<boolean>`${sql.ref("page.id")} = ${pageId}`),
		)
		.leftJoin("users as owner", "owner.id", "page.userId")
		.leftJoin("segments as title", (join) =>
			join.onRef("title.contentId", "=", "page.id").on("title.number", "=", 0),
		)
		.leftJoin(
			"segmentTranslations as translation",
			"translation.id",
			"n.segmentTranslationId",
		)
		.where("recipient.handle", "=", currentUserHandle)
		.where((eb) =>
			eb.or([eb("n.type", "=", "FOLLOW"), eb("title.id", "is not", null)]),
		);
}

export function fetchNotificationRowsWithRelations(
	currentUserHandle: string,
): Promise<NotificationRowsWithRelations[]> {
	return notificationRows(currentUserHandle)
		.select([
			"n.id",
			"n.actorId",
			"n.type",
			"n.read",
			"n.createdAt",
			"actor.handle as actorHandle",
			"actor.name as actorName",
			"actor.image as actorImage",
			"page.slug as pageSlug",
			"owner.handle as pageOwnerHandle",
			"title.text as pageTitle",
			sql<
				string | null
			>`case when ${sql.ref("n.type")} in ('PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE') then ${sql.ref("translation.text")} else null end`.as(
				"segmentTranslationText",
			),
		])
		.orderBy("n.createdAt", "desc")
		.execute();
}

export async function fetchUnreadNotificationCount(currentUserHandle: string) {
	const result = await notificationRows(currentUserHandle)
		.where("n.read", "=", false)
		.select(({ fn }) => fn.count<number>("n.id").as("count"))
		.executeTakeFirstOrThrow();
	return result.count;
}
