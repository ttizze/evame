/**
 * ページ詳細を取得
 * Kysely ORM版 - シンプル化
 */

import { cacheLife, cacheTag } from "next/cache";
import { serverLogger } from "@/app/_service/logger.server";
import type { SegmentWithSegmentType } from "@/app/[locale]/types";
import { db } from "@/db";
import { bestTranslationSubquery } from "./best-translation-subquery.server";

// ============================================
// 内部型定義
// ============================================

type SegmentWithAnnotations = SegmentWithSegmentType & {
	annotations: Array<{ annotationSegment: SegmentWithSegmentType }>;
};

// ============================================
// 内部ヘルパー
// ============================================

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
				.selectFrom("pageComments")
				.select(eb.fn.countAll<number>().as("count"))
				.whereRef("pageComments.pageId", "=", "pages.id")
				.where("pageComments.isDeleted", "=", false)
				.as("pageComments"),
			eb
				.selectFrom("likePages")
				.select(eb.fn.countAll<number>().as("count"))
				.whereRef("likePages.pageId", "=", "pages.id")
				.as("likeCount"),
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	return {
		pageComments: result?.pageComments ?? 0,
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
	segmentTypeKey?: "PRIMARY" | "COMMENTARY",
): Promise<SegmentWithSegmentType[]> {
	// セグメント + 最良の翻訳を1クエリで取得
	let query = db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
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
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"trans.text as translationText",
		])
		.where("segments.contentId", "=", pageId);

	if (segmentTypeKey) {
		query = query.where("segmentTypes.key", "=", segmentTypeKey);
	}

	return query.orderBy("segments.number", "asc").execute();
}

/**
 * セグメントに注釈を追加
 */
async function addAnnotations(
	segments: SegmentWithSegmentType[],
	pageId: number,
	locale: string,
	pageOwnerId: string,
): Promise<SegmentWithAnnotations[]> {
	const segmentIds = segments.map((s) => s.id);
	if (segmentIds.length === 0) {
		return segments.map((s) => ({ ...s, annotations: [] }));
	}

	// 注釈リンクを取得
	const links = await db
		.selectFrom("segmentAnnotationLinks")
		.select(["mainSegmentId", "annotationSegmentId"])
		.where("mainSegmentId", "in", segmentIds)
		.execute();

	const annotationSegmentIds = [
		...new Set(links.map((l) => l.annotationSegmentId)),
	];

	if (annotationSegmentIds.length === 0) {
		return segments.map((s) => ({ ...s, annotations: [] }));
	}

	// 注釈セグメントを取得
	const annotationSegments = await fetchSegmentsByIds(
		annotationSegmentIds,
		locale,
		pageOwnerId,
	);
	const annotationMap = new Map(annotationSegments.map((s) => [s.id, s]));

	// リンクをMapに変換
	const linksMap = new Map<number, number[]>();
	for (const link of links) {
		const existing = linksMap.get(link.mainSegmentId) || [];
		existing.push(link.annotationSegmentId);
		linksMap.set(link.mainSegmentId, existing);
	}

	return segments.map((segment) => {
		const annotationIds = linksMap.get(segment.id) || [];
		const annotations = annotationIds
			.map((id) => {
				const annotationSegment = annotationMap.get(id);
				if (!annotationSegment) {
					serverLogger.warn(
						{ annotationSegmentId: id, mainSegmentId: segment.id, pageId },
						"Annotation segment not found, skipping",
					);
					return null;
				}
				return { annotationSegment };
			})
			.filter(
				(a): a is { annotationSegment: SegmentWithSegmentType } => a !== null,
			);

		return { ...segment, annotations };
	});
}

/**
 * ID指定でセグメントを取得
 */
async function fetchSegmentsByIds(
	segmentIds: number[],
	locale: string,
	pageOwnerId: string,
): Promise<SegmentWithSegmentType[]> {
	if (segmentIds.length === 0) return [];

	return db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
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
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"trans.text as translationText",
		])
		.where("segments.id", "in", segmentIds)
		.execute();
}

// ============================================
// 公開API
// ============================================

/**
 * ページ詳細を取得
 */
export async function fetchPageDetail(slug: string, locale: string) {
	"use cache";
	cacheLife("max");

	const page = await fetchPageBasicBySlug(slug);
	if (!page) return null;

	cacheTag(`page:${page.id}`);

	const tags = await fetchTags(page.id);

	// 1. PRIMARYセグメントを取得
	let segments = await fetchSegments(page.id, locale, page.userId, "PRIMARY");

	// 2. PRIMARYセグメントがない場合、COMMENTARYセグメントをフォールバック
	if (segments.length === 0) {
		segments = await fetchSegments(page.id, locale, page.userId, "COMMENTARY");
	}

	// 3. 注釈を追加
	const segmentsWithAnnotations = await addAnnotations(
		segments,
		page.id,
		locale,
		page.userId,
	);

	// 4. タイトルを生成
	const titleSegment = segmentsWithAnnotations.find((s) => s.number === 0);
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
		segments: segmentsWithAnnotations,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
		userId: page.userId,
		userName: page.userName,
		userHandle: page.userHandle,
		userImage: page.userImage,
		tagPages: tags,
	};
}
