/**
 * ページ詳細を取得
 * Kysely ORM版 - シンプル化
 */

import { serverLogger } from "@/app/_service/logger.server";
import { db } from "@/db";
import { bestTranslationSubquery } from "./best-translation-subquery.server";

// ============================================
// 内部型定義
// ============================================

type SegmentWithTranslation = {
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
		user: UserInfo;
	} | null;
};

type UserInfo = {
	id: string;
	name: string;
	handle: string;
	image: string;
	createdAt: Date;
	updatedAt: Date;
	profile: string;
	twitterHandle: string;
	totalPoints: number;
	isAi: boolean;
	plan: string;
};

type SegmentWithAnnotations = SegmentWithTranslation & {
	annotations: Array<{ annotationSegment: SegmentWithTranslation }>;
};

// ============================================
// 内部ヘルパー
// ============================================

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
			"users.isAi as userIsAi",
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
			isAi: result.userIsAi,
			plan: result.userPlan,
		},
	};
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
 * カウントを取得
 */
async function fetchCounts(pageId: number) {
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
				.selectFrom("pages as c")
				.select(eb.fn.countAll<number>().as("count"))
				.whereRef("c.parentId", "=", "pages.id")
				.where("c.status", "=", "PUBLIC")
				.as("children"),
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
		children: result?.children ?? 0,
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
): Promise<SegmentWithTranslation[]> {
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
			"segments.textAndOccurrenceHash",
			"segments.createdAt",
			"segments.segmentTypeId",
			"segmentTypes.key as typeKey",
			"segmentTypes.label as typeLabel",
			"trans.id as transId",
			"trans.segmentId as transSegmentId",
			"trans.userId as transUserId",
			"trans.locale as transLocale",
			"trans.text as transText",
			"trans.point as transPoint",
			"trans.createdAt as transCreatedAt",
			"trans.userName",
			"trans.userHandle",
			"trans.userImage",
			"trans.userCreatedAt",
			"trans.userUpdatedAt",
			"trans.userProfile",
			"trans.userTwitterHandle",
			"trans.userTotalPoints",
			"trans.userIsAi",
			"trans.userPlan",
		])
		.where("segments.contentId", "=", pageId);

	if (segmentTypeKey) {
		query = query.where("segmentTypes.key", "=", segmentTypeKey);
	}

	const rows = await query.orderBy("segments.number", "asc").execute();

	return rows.map((row) => ({
		id: row.id,
		contentId: row.contentId,
		number: row.number,
		text: row.text,
		textAndOccurrenceHash: row.textAndOccurrenceHash,
		createdAt: row.createdAt,
		segmentTypeId: row.segmentTypeId,
		segmentType: {
			key: row.typeKey,
			label: row.typeLabel,
		},
		segmentTranslation: row.transId
			? {
					id: row.transId,
					segmentId: row.transSegmentId!,
					userId: row.transUserId!,
					locale: row.transLocale!,
					text: row.transText!,
					point: row.transPoint!,
					createdAt: row.transCreatedAt!,
					user: {
						id: row.transUserId!,
						name: row.userName!,
						handle: row.userHandle!,
						image: row.userImage!,
						createdAt: row.userCreatedAt!,
						updatedAt: row.userUpdatedAt!,
						profile: row.userProfile!,
						twitterHandle: row.userTwitterHandle!,
						totalPoints: row.userTotalPoints!,
						isAi: row.userIsAi!,
						plan: row.userPlan!,
					},
				}
			: null,
	}));
}

/**
 * セグメントに注釈を追加
 */
async function addAnnotations(
	segments: SegmentWithTranslation[],
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
				(a): a is { annotationSegment: SegmentWithTranslation } => a !== null,
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
): Promise<SegmentWithTranslation[]> {
	if (segmentIds.length === 0) return [];

	const rows = await db
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
			"segments.textAndOccurrenceHash",
			"segments.createdAt",
			"segments.segmentTypeId",
			"segmentTypes.key as typeKey",
			"segmentTypes.label as typeLabel",
			"trans.id as transId",
			"trans.segmentId as transSegmentId",
			"trans.userId as transUserId",
			"trans.locale as transLocale",
			"trans.text as transText",
			"trans.point as transPoint",
			"trans.createdAt as transCreatedAt",
			"trans.userName",
			"trans.userHandle",
			"trans.userImage",
			"trans.userCreatedAt",
			"trans.userUpdatedAt",
			"trans.userProfile",
			"trans.userTwitterHandle",
			"trans.userTotalPoints",
			"trans.userIsAi",
			"trans.userPlan",
		])
		.where("segments.id", "in", segmentIds)
		.execute();

	return rows.map((row) => ({
		id: row.id,
		contentId: row.contentId,
		number: row.number,
		text: row.text,
		textAndOccurrenceHash: row.textAndOccurrenceHash,
		createdAt: row.createdAt,
		segmentTypeId: row.segmentTypeId,
		segmentType: {
			key: row.typeKey,
			label: row.typeLabel,
		},
		segmentTranslation: row.transId
			? {
					id: row.transId,
					segmentId: row.transSegmentId!,
					userId: row.transUserId!,
					locale: row.transLocale!,
					text: row.transText!,
					point: row.transPoint!,
					createdAt: row.transCreatedAt!,
					user: {
						id: row.transUserId!,
						name: row.userName!,
						handle: row.userHandle!,
						image: row.userImage!,
						createdAt: row.userCreatedAt!,
						updatedAt: row.userUpdatedAt!,
						profile: row.userProfile!,
						twitterHandle: row.userTwitterHandle!,
						totalPoints: row.userTotalPoints!,
						isAi: row.userIsAi!,
						plan: row.userPlan!,
					},
				}
			: null,
	}));
}

// ============================================
// 公開API
// ============================================

/**
 * ページ詳細を取得
 */
export async function fetchPageDetail(slug: string, locale: string) {
	// 1. ページ基本情報を取得
	const page = await fetchPageBasicBySlug(slug);
	if (!page) return null;

	// 2. タグとカウントを並列取得
	const [tags, counts] = await Promise.all([
		fetchTags(page.id),
		fetchCounts(page.id),
	]);

	// 3. PRIMARYセグメントを取得
	let segments = await fetchSegments(page.id, locale, page.user.id, "PRIMARY");

	// 4. PRIMARYセグメントがない場合、COMMENTARYセグメントをフォールバック
	if (segments.length === 0) {
		segments = await fetchSegments(page.id, locale, page.user.id, "COMMENTARY");
	}

	// 5. 注釈を追加
	const segmentsWithAnnotations = await addAnnotations(
		segments,
		page.id,
		locale,
		page.user.id,
	);

	return {
		id: page.id,
		slug: page.slug,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
		status: page.status,
		sourceLocale: page.sourceLocale,
		parentId: page.parentId,
		order: page.order,
		likeCount: counts.likeCount,
		mdastJson: page.mdastJson,
		user: page.user,
		tagPages: tags,
		_count: {
			pageComments: counts.pageComments,
			children: counts.children,
		},
		content: {
			segments: segmentsWithAnnotations,
		},
	};
}
