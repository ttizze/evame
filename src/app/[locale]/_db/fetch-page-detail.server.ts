/**
 * ページ詳細を取得
 * Kysely ORM版に移行済み
 */

import { db } from "@/db";
import { serverLogger } from "@/lib/logger.server";
import {
	buildSegmentsMap,
	fetchCountsForPages,
	fetchTagsForPages,
} from "./page-list-helpers.server";

/**
 * ページ基本情報を取得（slugで）
 */
async function fetchPageBasicBySlug(slug: string) {
	const result = await db
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
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		])
		.where("pages.slug", "=", slug)
		.executeTakeFirst();

	if (!result) return null;

	return {
		id: result.id,
		slug: result.slug,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
		status: result.status,
		sourceLocale: result.sourceLocale,
		parentId: result.parentId,
		order: result.order,
		mdastJson: result.mdastJson,
		user: {
			id: result.userId,
			name: result.userName,
			handle: result.userHandle,
			image: result.userImage,
			createdAt: result.userCreatedAt,
			updatedAt: result.userUpdatedAt,
			profile: result.userProfile,
			twitterHandle: result.userTwitterHandle,
			totalPoints: result.userTotalPoints,
			isAI: result.userIsAI,
			plan: result.userPlan,
		},
	};
}

/**
 * セグメントとその注釈を取得（segmentTypeKeyでフィルタリング可能）
 */
async function fetchSegmentsWithAnnotations(
	pageId: number,
	locale: string,
	segmentTypeKey?: "PRIMARY" | "COMMENTARY",
) {
	// セグメントとその最良の翻訳を取得
	let query = db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin("segmentTranslations", (join) =>
			join
				.onRef("segments.id", "=", "segmentTranslations.segmentId")
				.on("segmentTranslations.locale", "=", locale),
		)
		.leftJoin("users", "segmentTranslations.userId", "users.id")
		.select([
			"segments.id as segmentId",
			"segments.contentId as segmentContentId",
			"segments.number as segmentNumber",
			"segments.text as segmentText",
			"segments.textAndOccurrenceHash as segmentTextAndOccurrenceHash",
			"segments.createdAt as segmentCreatedAt",
			"segments.segmentTypeId as segmentSegmentTypeId",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"segmentTranslations.id as translationId",
			"segmentTranslations.segmentId as translationSegmentId",
			"segmentTranslations.userId as translationUserId",
			"segmentTranslations.locale as translationLocale",
			"segmentTranslations.text as translationText",
			"segmentTranslations.point as translationPoint",
			"segmentTranslations.createdAt as translationCreatedAt",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		])
		.where("segments.contentId", "=", pageId);

	if (segmentTypeKey) {
		query = query.where("segmentTypes.key", "=", segmentTypeKey);
	}

	const allSegments = await query
		.orderBy("segments.number", "asc")
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc")
		.execute();

	// buildSegmentsMap用にデータを変換
	const mappedSegments = allSegments.map((row) => ({
		segment: {
			id: row.segmentId,
			contentId: row.segmentContentId,
			number: row.segmentNumber,
			text: row.segmentText,
			textAndOccurrenceHash: row.segmentTextAndOccurrenceHash,
			createdAt: row.segmentCreatedAt,
			segmentTypeId: row.segmentSegmentTypeId,
		},
		segmentType: {
			key: row.segmentTypeKey,
			label: row.segmentTypeLabel,
		},
		translation: row.translationId
			? {
					id: row.translationId,
					segmentId: row.translationSegmentId!,
					userId: row.translationUserId!,
					locale: row.translationLocale!,
					text: row.translationText!,
					point: row.translationPoint!,
					createdAt: row.translationCreatedAt!,
				}
			: null,
		translationUser: row.userId
			? {
					id: row.userId,
					name: row.userName!,
					handle: row.userHandle!,
					image: row.userImage!,
					createdAt: row.userCreatedAt!,
					updatedAt: row.userUpdatedAt!,
					profile: row.userProfile!,
					twitterHandle: row.userTwitterHandle!,
					totalPoints: row.userTotalPoints!,
					isAI: row.userIsAI!,
					plan: row.userPlan!,
				}
			: null,
	}));

	// セグメントごとにグループ化し、最良の翻訳を1件のみ選択
	const segmentsMap = buildSegmentsMap(mappedSegments);
	const segmentList = Array.from(segmentsMap.values());

	// 注釈を取得
	const segmentIds = segmentList.map((s) => s.id);
	if (segmentIds.length === 0) {
		return segmentList.map((s) => ({ ...s, annotations: [] }));
	}

	const annotations = await db
		.selectFrom("segmentAnnotationLinks")
		.select(["mainSegmentId", "annotationSegmentId", "createdAt"])
		.where("mainSegmentId", "in", segmentIds)
		.execute();

	// 注釈セグメントIDを取得
	const annotationSegmentIds = [
		...new Set(annotations.map((a) => a.annotationSegmentId)),
	];

	if (annotationSegmentIds.length === 0) {
		return segmentList.map((s) => ({
			...s,
			annotations: [],
		}));
	}

	// 注釈セグメントとその翻訳を取得
	const annotationSegmentsRaw = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin("segmentTranslations", (join) =>
			join
				.onRef("segments.id", "=", "segmentTranslations.segmentId")
				.on("segmentTranslations.locale", "=", locale),
		)
		.leftJoin("users", "segmentTranslations.userId", "users.id")
		.select([
			"segments.id as segmentId",
			"segments.contentId as segmentContentId",
			"segments.number as segmentNumber",
			"segments.text as segmentText",
			"segments.textAndOccurrenceHash as segmentTextAndOccurrenceHash",
			"segments.createdAt as segmentCreatedAt",
			"segments.segmentTypeId as segmentSegmentTypeId",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"segmentTranslations.id as translationId",
			"segmentTranslations.segmentId as translationSegmentId",
			"segmentTranslations.userId as translationUserId",
			"segmentTranslations.locale as translationLocale",
			"segmentTranslations.text as translationText",
			"segmentTranslations.point as translationPoint",
			"segmentTranslations.createdAt as translationCreatedAt",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		])
		.where("segments.id", "in", annotationSegmentIds)
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc")
		.execute();

	// 注釈セグメントをマップに変換
	const mappedAnnotationSegments = annotationSegmentsRaw.map((row) => ({
		segment: {
			id: row.segmentId,
			contentId: row.segmentContentId,
			number: row.segmentNumber,
			text: row.segmentText,
			textAndOccurrenceHash: row.segmentTextAndOccurrenceHash,
			createdAt: row.segmentCreatedAt,
			segmentTypeId: row.segmentSegmentTypeId,
		},
		segmentType: {
			key: row.segmentTypeKey,
			label: row.segmentTypeLabel,
		},
		translation: row.translationId
			? {
					id: row.translationId,
					segmentId: row.translationSegmentId!,
					userId: row.translationUserId!,
					locale: row.translationLocale!,
					text: row.translationText!,
					point: row.translationPoint!,
					createdAt: row.translationCreatedAt!,
				}
			: null,
		translationUser: row.userId
			? {
					id: row.userId,
					name: row.userName!,
					handle: row.userHandle!,
					image: row.userImage!,
					createdAt: row.userCreatedAt!,
					updatedAt: row.userUpdatedAt!,
					profile: row.userProfile!,
					twitterHandle: row.userTwitterHandle!,
					totalPoints: row.userTotalPoints!,
					isAI: row.userIsAI!,
					plan: row.userPlan!,
				}
			: null,
	}));

	const annotationSegmentsMap = buildSegmentsMap(mappedAnnotationSegments);

	// 注釈をセグメントに結合
	const annotationsMap = new Map<number, typeof annotations>();
	for (const annotation of annotations) {
		const existing = annotationsMap.get(annotation.mainSegmentId) || [];
		annotationsMap.set(annotation.mainSegmentId, [...existing, annotation]);
	}

	return segmentList.map((segment) => {
		const segmentAnnotations = annotationsMap.get(segment.id) || [];
		return {
			...segment,
			annotations: segmentAnnotations
				.map((link) => {
					const annotationSegment = annotationSegmentsMap.get(
						link.annotationSegmentId,
					);
					if (!annotationSegment) {
						// 注釈セグメントが見つからない場合はスキップ（耐障害性）
						serverLogger.warn(
							{
								annotationSegmentId: link.annotationSegmentId,
								mainSegmentId: link.mainSegmentId,
								pageId,
							},
							"Annotation segment not found, skipping",
						);
						return null;
					}
					return {
						annotationSegment,
					};
				})
				.filter(
					(
						v,
					): v is {
						annotationSegment: NonNullable<typeof v>["annotationSegment"];
					} => v !== null,
				),
		};
	});
}

/**
 * ページ詳細を取得
 * Kysely ORM版に移行済み
 */
export async function fetchPageDetail(slug: string, locale: string) {
	// 1. ページ基本情報を取得
	const page = await fetchPageBasicBySlug(slug);
	if (!page) {
		return null;
	}

	// 2. タグとカウントを並列取得
	const [tagsData, countsData] = await Promise.all([
		fetchTagsForPages([page.id]),
		fetchCountsForPages([page.id]),
	]);

	const tags = tagsData.map((t) => ({ tag: t.tag }));
	const counts = countsData[0] || { pageComments: 0, children: 0 };

	// 3. PRIMARYセグメントを取得
	let segments = await fetchSegmentsWithAnnotations(page.id, locale, "PRIMARY");

	// 4. PRIMARYセグメントがない場合、COMMENTARYセグメントをフォールバック
	if (segments.length === 0) {
		segments = await fetchSegmentsWithAnnotations(
			page.id,
			locale,
			"COMMENTARY",
		);
	}

	return {
		id: page.id,
		slug: page.slug,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
		status: page.status,
		sourceLocale: page.sourceLocale,
		parentId: page.parentId,
		order: page.order,
		mdastJson: page.mdastJson,
		user: page.user,
		tagPages: tags,
		_count: {
			pageComments: counts.pageComments,
			children: counts.children,
		},
		content: {
			segments,
		},
	};
}
