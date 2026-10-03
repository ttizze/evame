import type { Segment } from "@/app/[locale]/types";
import { db } from "@/db";
import { bestTranslationSubquery } from "./best-translation-subquery.server";

/**
 * ページ基本情報を取得（slugで）
 */
async function fetchPageBasicBySlug(slug: string) {
	return await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.id",
			"pages.slug",
			"pages.createdAt",
			"pages.updatedAt",
			"pages.status",
			"pages.sourceLocale",
			"pages.parentId",
			"pages.order",
			"pages.mdastJson",
			"pages.publishedAt",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
		])
		.where("pages.slug", "=", slug)
		.executeTakeFirst();
}

/**
 * タグを取得
 */
async function fetchTags(pageId: number) {
	const result = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select(["tags.id", "tags.name"])
		.where("tagPages.pageId", "=", pageId)
		.execute();

	return result.map((t) => ({ tag: { id: t.id, name: t.name } }));
}

/**
 * カウントを取得（最新値が必要なのでキャッシュしない）
 */
export async function fetchPageCounts(pageId: number) {
	const result = await db
		.selectFrom("pages")
		.select((eb) => [
			eb
				.selectFrom("likePages")
				.select(eb.fn.countAll<number>().as("count"))
				.whereRef("likePages.pageId", "=", "pages.id")
				.as("likeCount"),
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	return {
		likeCount: result?.likeCount ?? 0,
	};
}

/**
 * セグメントを取得（DISTINCT ONで最良の翻訳を1件のみ）
 */
async function fetchSegments(
	pageId: number,
	locale: string,
	pageOwnerId: string,
): Promise<Segment[]> {
	// セグメント + 最良の翻訳を1クエリで取得
	return await db
		.selectFrom("segments")
		.leftJoin(
			(eb) =>
				bestTranslationSubquery(eb, { locale, ownerUserId: pageOwnerId }).as(
					"trans",
				),
			(join) => join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"segments.id",
			"segments.contentId",
			"segments.number",
			"segments.text",
			"trans.text as translationText",
		])
		.where("segments.contentId", "=", pageId)
		.orderBy("segments.number", "asc")
		.execute();
}

/**
 * ページ詳細を取得
 */
export async function queryPageDetail(slug: string, locale: string) {
	const page = await fetchPageBasicBySlug(slug);
	if (!page) return null;
	if (page.status === "ARCHIVE") return null;

	const tags = await fetchTags(page.id);

	const segments = await fetchSegments(page.id, locale, page.userId);
	const titleSegment = segments.find((segment) => segment.number === 0);
	const title = titleSegment
		? titleSegment.translationText
			? `${titleSegment.text} - ${titleSegment.translationText}`
			: titleSegment.text
		: "";

	return {
		id: page.id,
		slug: page.slug,
		title,
		status: page.status,
		sourceLocale: page.sourceLocale,
		parentId: page.parentId,
		order: page.order,
		mdastJson: page.mdastJson,
		segments,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
		userId: page.userId,
		userName: page.userName,
		userHandle: page.userHandle,
		userImage: page.userImage,
		tagPages: tags,
	};
}
