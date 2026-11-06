import { bestTranslationId } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import { COMMENT_PAGE_SIZE } from "../../../constants";

export type PageComment = Awaited<
	ReturnType<typeof fetchPageCommentsWithSegments>
>["comments"][number];
export type PageCommentWithSegments = PageComment & {
	replies: PageCommentWithSegments[];
};

/** 20件のルートコメントと、そのスレッド内の全返信を取得する。 */
export async function fetchPageCommentsWithSegments(
	pageId: number,
	locale: string,
	page: number,
) {
	const roots = db
		.selectFrom("pageComments")
		.select("id")
		.where("pageId", "=", pageId)
		.where("parentId", "is", null)
		.orderBy("createdAt", "asc")
		.orderBy("id", "asc")
		.limit(COMMENT_PAGE_SIZE)
		.offset((page - 1) * COMMENT_PAGE_SIZE);
	const threadIds = db
		.withRecursive("commentThread", (qb) =>
			qb
				.selectFrom(roots.as("roots"))
				.select("roots.id")
				.unionAll(
					qb
						.selectFrom("commentThread")
						.crossJoin("pageComments")
						.whereRef("pageComments.parentId", "=", "commentThread.id")
						.where("pageComments.pageId", "=", pageId)
						.select("pageComments.id"),
				),
		)
		.selectFrom("commentThread")
		.select("id");
	const [comments, counts] = await Promise.all([
		db
			.selectFrom("pageComments")
			.innerJoin("users", "pageComments.userId", "users.id")
			.select([
				"pageComments.id",
				"pageComments.pageId",
				"pageComments.createdAt",
				"pageComments.updatedAt",
				"pageComments.locale",
				"pageComments.userId",
				"pageComments.parentId",
				"pageComments.mdastJson",
				"pageComments.isDeleted",
				"pageComments.lastReplyAt",
				"pageComments.replyCount",
				"users.handle as userHandle",
				"users.name as userName",
				"users.image as userImage",
			])
			.where("pageComments.id", "in", threadIds)
			.orderBy("pageComments.createdAt", "asc")
			.orderBy("pageComments.id", "asc")
			.execute(),
		db
			.selectFrom("pageComments")
			.select((eb) => [
				eb.fn
					.countAll<number>()
					.filterWhere("isDeleted", "=", false)
					.as("count"),
				eb.fn
					.countAll<number>()
					.filterWhere("parentId", "is", null)
					.as("roots"),
			])
			.where("pageId", "=", pageId)
			.executeTakeFirstOrThrow(),
	]);
	const segments =
		comments.length === 0
			? []
			: await db
					.selectFrom("segments")
					.innerJoin(
						"pageComments as ownerComment",
						"ownerComment.id",
						"segments.contentId",
					)
					.leftJoin("segmentTranslations as trans", (join) =>
						join.on("trans.id", "=", (eb) =>
							bestTranslationId(
								eb.ref("segments.id"),
								eb.ref("ownerComment.userId"),
								locale,
							),
						),
					)
					.select([
						"segments.id",
						"segments.contentId",
						"segments.number",
						"segments.text",
						"trans.text as translationText",
					])
					.where(
						"segments.contentId",
						"in",
						comments.map((comment) => comment.id),
					)
					.orderBy("segments.id")
					.execute();
	const segmentsMap = new Map<number, typeof segments>();
	for (const segment of segments) {
		const existing = segmentsMap.get(segment.contentId) ?? [];
		existing.push(segment);
		segmentsMap.set(segment.contentId, existing);
	}
	return {
		comments: comments.map(
			({ userHandle, userName, userImage, ...comment }) => ({
				...comment,
				user: { handle: userHandle, name: userName, image: userImage },
				content: { segments: segmentsMap.get(comment.id) ?? [] },
			}),
		),
		count: counts.count,
		totalPages: Math.ceil(counts.roots / COMMENT_PAGE_SIZE),
	};
}
