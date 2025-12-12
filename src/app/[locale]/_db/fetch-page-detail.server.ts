/**
 * ページ詳細を取得
 * Drizzle ORM版に移行済み
 */

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	pages,
	segmentAnnotationLinks,
	segments as segmentsTable,
	segmentTranslations,
	segmentTypes,
	users,
} from "@/drizzle/schema";
import {
	fetchCountsForPages,
	fetchTagsForPages,
} from "./page-list-helpers.server";

/**
 * ページ基本情報を取得（slugで）
 */
async function fetchPageBasicBySlug(slug: string) {
	const result = await db
		.select({
			id: pages.id,
			slug: pages.slug,
			createdAt: pages.createdAt,
			updatedAt: pages.updatedAt,
			status: pages.status,
			sourceLocale: pages.sourceLocale,
			parentId: pages.parentId,
			order: pages.order,
			userId: pages.userId,
			mdastJson: pages.mdastJson,
			user: {
				id: users.id,
				name: users.name,
				handle: users.handle,
				image: users.image,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
		.where(eq(pages.slug, slug))
		.limit(1);

	return result[0] || null;
}

/**
 * セグメントと翻訳のクエリ結果を、セグメントごとにグループ化して最良の翻訳を1件のみ選択
 */
export function buildSegmentsMap(
	rows: Array<{
		segment: {
			id: number;
			contentId: number;
			number: number;
			text: string;
			textAndOccurrenceHash: string;
			createdAt: Date;
			segmentTypeId: number;
		};
		segmentType: {
			key: string;
			label: string;
		};
		translation: {
			id: number;
			segmentId: number;
			userId: string;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
		} | null;
		translationUser: {
			id: string;
			name: string;
			handle: string;
			image: string;
			createdAt: Date;
			updatedAt: Date;
			profile: string;
			twitterHandle: string;
			totalPoints: number;
			isAI: boolean;
			plan: string;
		} | null;
	}>,
) {
	const segmentsMap = new Map<
		number,
		{
			id: number;
			contentId: number;
			number: number;
			text: string;
			textAndOccurrenceHash: string;
			createdAt: Date;
			segmentTypeId: number;
			segmentType: { key: string; label: string };
			segmentTranslation: {
				id: number;
				segmentId: number;
				userId: string;
				locale: string;
				text: string;
				point: number;
				createdAt: Date;
				user: {
					id: string;
					name: string;
					handle: string;
					image: string;
					createdAt: Date;
					updatedAt: Date;
					profile: string;
					twitterHandle: string;
					totalPoints: number;
					isAI: boolean;
					plan: string;
				};
			} | null;
		}
	>();

	for (const row of rows) {
		const segmentId = row.segment.id;

		if (!segmentsMap.has(segmentId)) {
			segmentsMap.set(segmentId, {
				...row.segment,
				segmentType: row.segmentType,
				segmentTranslation: null,
			});
		}

		// 最初の翻訳のみ追加（既にpoint DESC, createdAt DESCでソート済み）
		const segment = segmentsMap.get(segmentId);
		if (!segment) continue;

		if (
			row.translation?.id &&
			row.translationUser &&
			segment.segmentTranslation === null
		) {
			segment.segmentTranslation = {
				...row.translation,
				user: row.translationUser,
			};
		}
	}

	return segmentsMap;
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
	const allSegments = await db
		.select({
			segment: {
				id: segmentsTable.id,
				contentId: segmentsTable.contentId,
				number: segmentsTable.number,
				text: segmentsTable.text,
				textAndOccurrenceHash: segmentsTable.textAndOccurrenceHash,
				createdAt: segmentsTable.createdAt,
				segmentTypeId: segmentsTable.segmentTypeId,
			},
			segmentType: {
				key: segmentTypes.key,
				label: segmentTypes.label,
			},
			translation: {
				id: segmentTranslations.id,
				segmentId: segmentTranslations.segmentId,
				userId: segmentTranslations.userId,
				locale: segmentTranslations.locale,
				text: segmentTranslations.text,
				point: segmentTranslations.point,
				createdAt: segmentTranslations.createdAt,
			},
			translationUser: {
				id: users.id,
				name: users.name,
				handle: users.handle,
				image: users.image,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(segmentsTable)
		.innerJoin(segmentTypes, eq(segmentsTable.segmentTypeId, segmentTypes.id))
		.leftJoin(
			segmentTranslations,
			and(
				eq(segmentsTable.id, segmentTranslations.segmentId),
				eq(segmentTranslations.locale, locale),
			),
		)
		.leftJoin(users, eq(segmentTranslations.userId, users.id))
		.where(
			and(
				eq(segmentsTable.contentId, pageId),
				segmentTypeKey ? eq(segmentTypes.key, segmentTypeKey) : undefined,
			),
		)
		.orderBy(
			asc(segmentsTable.number),
			desc(segmentTranslations.point),
			desc(segmentTranslations.createdAt),
		);

	// セグメントごとにグループ化し、最良の翻訳を1件のみ選択
	const segmentsMap = buildSegmentsMap(allSegments);
	const segmentList = Array.from(segmentsMap.values());

	// 注釈を取得
	const segmentIds = segmentList.map((s) => s.id);
	if (segmentIds.length === 0) {
		return segmentList.map((s) => ({ ...s, annotations: [] }));
	}

	const annotations = await db
		.select({
			mainSegmentId: segmentAnnotationLinks.mainSegmentId,
			annotationSegmentId: segmentAnnotationLinks.annotationSegmentId,
			createdAt: segmentAnnotationLinks.createdAt,
		})
		.from(segmentAnnotationLinks)
		.where(inArray(segmentAnnotationLinks.mainSegmentId, segmentIds));

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
		.select({
			segment: {
				id: segmentsTable.id,
				contentId: segmentsTable.contentId,
				number: segmentsTable.number,
				text: segmentsTable.text,
				textAndOccurrenceHash: segmentsTable.textAndOccurrenceHash,
				createdAt: segmentsTable.createdAt,
				segmentTypeId: segmentsTable.segmentTypeId,
			},
			segmentType: {
				key: segmentTypes.key,
				label: segmentTypes.label,
			},
			translation: {
				id: segmentTranslations.id,
				segmentId: segmentTranslations.segmentId,
				userId: segmentTranslations.userId,
				locale: segmentTranslations.locale,
				text: segmentTranslations.text,
				point: segmentTranslations.point,
				createdAt: segmentTranslations.createdAt,
			},
			translationUser: {
				id: users.id,
				name: users.name,
				handle: users.handle,
				image: users.image,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(segmentsTable)
		.innerJoin(segmentTypes, eq(segmentsTable.segmentTypeId, segmentTypes.id))
		.leftJoin(
			segmentTranslations,
			and(
				eq(segmentsTable.id, segmentTranslations.segmentId),
				eq(segmentTranslations.locale, locale),
			),
		)
		.leftJoin(users, eq(segmentTranslations.userId, users.id))
		.where(inArray(segmentsTable.id, annotationSegmentIds))
		.orderBy(
			desc(segmentTranslations.point),
			desc(segmentTranslations.createdAt),
		);

	// 注釈セグメントをマップに変換
	const annotationSegmentsMap = buildSegmentsMap(annotationSegmentsRaw);

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
			annotations: segmentAnnotations.map((link) => {
				const annotationSegment = annotationSegmentsMap.get(
					link.annotationSegmentId,
				);
				if (!annotationSegment) {
					throw new Error(
						`Annotation segment ${link.annotationSegmentId} not found`,
					);
				}
				return {
					annotationSegment,
				};
			}),
		};
	});
}

/**
 * ページ詳細を取得
 * Drizzle ORM版に移行済み
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
		userId: page.userId,
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
