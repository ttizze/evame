/**
 * ページ詳細取得のためのDBアクセス（Kysely）
 *
 * - ここは「DBクエリの部品」だけ置く（組み立て/用途別の返却形は service 側）
 */

import { sql } from "kysely";
import { db } from "@/db";
import type { JsonValue } from "@/db/types";
import { serverLogger } from "@/lib/logger.server";

// ============================================
// 内部型定義
// ============================================

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

type SegmentWithAnnotations = SegmentWithTranslation & {
	annotations: Array<{ annotationSegment: SegmentWithTranslation }>;
};

// ============================================
// 公開API（DB部品）
// ============================================

export async function fetchPageMdastJsonBySlug(slug: string) {
	const result = await db
		.selectFrom("pages")
		.select(["pages.mdastJson"])
		.where("pages.slug", "=", slug)
		.executeTakeFirst();

	return result?.mdastJson ?? null;
}

export async function fetchPageSectionSourceBySlug(
	slug: string,
): Promise<{ id: number; mdastJson: JsonValue } | null> {
	const result = await db
		.selectFrom("pages")
		.select(["pages.id", "pages.mdastJson"])
		.where("pages.slug", "=", slug)
		.executeTakeFirst();

	if (!result) return null;
	return { id: result.id, mdastJson: result.mdastJson };
}

export async function fetchPageBasicBySlug(slug: string) {
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

export async function fetchTags(pageId: number) {
	const result = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select(["tags.id", "tags.name"])
		.where("tagPages.pageId", "=", pageId)
		.execute();

	return result.map((t) => ({ tag: { id: t.id, name: t.name } }));
}

export async function fetchCounts(pageId: number) {
	const result = await db
		.selectFrom("pages")
		.select([
			sql<number>`(
				SELECT COUNT(*)::int FROM page_comments 
				WHERE page_id = ${pageId} AND is_deleted = false
			)`.as("pageComments"),
			sql<number>`(
				SELECT COUNT(*)::int FROM pages 
				WHERE parent_id = ${pageId} AND status = 'PUBLIC'
			)`.as("children"),
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	return {
		pageComments: result?.pageComments ?? 0,
		children: result?.children ?? 0,
	};
}

export async function countSegmentsBySlug(slug: string): Promise<number> {
	const result = await db
		.selectFrom("pages")
		.innerJoin("segments", "segments.contentId", "pages.id")
		.select(({ fn }) => fn.countAll().as("count"))
		.where("pages.slug", "=", slug)
		.executeTakeFirst();

	return Number(result?.count ?? 0);
}

export async function addAnnotations(
	segments: SegmentWithTranslation[],
	pageId: number,
	locale: string,
): Promise<SegmentWithAnnotations[]> {
	const segmentIds = segments.map((s) => s.id);
	if (segmentIds.length === 0) {
		return segments.map((s) => ({ ...s, annotations: [] }));
	}

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

	const annotationSegments = await fetchSegmentsByIds(
		annotationSegmentIds,
		locale,
	);
	const annotationMap = new Map(annotationSegments.map((s) => [s.id, s]));

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

async function fetchSegmentsByIds(
	segmentIds: number[],
	locale: string,
): Promise<SegmentWithTranslation[]> {
	if (segmentIds.length === 0) return [];

	const rows = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin(
			(eb) =>
				eb
					.selectFrom("segmentTranslations")
					.innerJoin("users", "segmentTranslations.userId", "users.id")
					.distinctOn("segmentTranslations.segmentId")
					.select([
						"segmentTranslations.id",
						"segmentTranslations.segmentId",
						"segmentTranslations.userId",
						"segmentTranslations.locale",
						"segmentTranslations.text",
						"segmentTranslations.point",
						"segmentTranslations.createdAt",
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
					.where("segmentTranslations.locale", "=", locale)
					.orderBy("segmentTranslations.segmentId")
					.orderBy("segmentTranslations.point", "desc")
					.orderBy("segmentTranslations.createdAt", "desc")
					.as("trans"),
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

export async function fetchSegmentsByNumbers(
	pageId: number,
	locale: string,
	numbers: number[],
): Promise<SegmentWithTranslation[]> {
	if (numbers.length === 0) return [];

	const rows = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin(
			(eb) =>
				eb
					.selectFrom("segmentTranslations")
					.innerJoin("users", "segmentTranslations.userId", "users.id")
					.distinctOn("segmentTranslations.segmentId")
					.select([
						"segmentTranslations.id",
						"segmentTranslations.segmentId",
						"segmentTranslations.userId",
						"segmentTranslations.locale",
						"segmentTranslations.text",
						"segmentTranslations.point",
						"segmentTranslations.createdAt",
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
					.where("segmentTranslations.locale", "=", locale)
					.orderBy("segmentTranslations.segmentId")
					.orderBy("segmentTranslations.point", "desc")
					.orderBy("segmentTranslations.createdAt", "desc")
					.as("trans"),
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
		.where("segments.contentId", "=", pageId)
		.where("segments.number", "in", numbers)
		.orderBy("segments.number", "asc")
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

export async function fetchAllSegmentsByPageId(
	pageId: number,
	locale: string,
): Promise<SegmentWithTranslation[]> {
	const rows = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin(
			(eb) =>
				eb
					.selectFrom("segmentTranslations")
					.innerJoin("users", "segmentTranslations.userId", "users.id")
					.distinctOn("segmentTranslations.segmentId")
					.select([
						"segmentTranslations.id",
						"segmentTranslations.segmentId",
						"segmentTranslations.userId",
						"segmentTranslations.locale",
						"segmentTranslations.text",
						"segmentTranslations.point",
						"segmentTranslations.createdAt",
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
					.where("segmentTranslations.locale", "=", locale)
					.orderBy("segmentTranslations.segmentId")
					.orderBy("segmentTranslations.point", "desc")
					.orderBy("segmentTranslations.createdAt", "desc")
					.as("trans"),
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
		.where("segments.contentId", "=", pageId)
		.orderBy("segments.number", "asc")
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

export async function fetchPageSsrSectionBySlug(slug: string): Promise<{
	page: NonNullable<Awaited<ReturnType<typeof fetchPageBasicBySlug>>>;
	tags: Awaited<ReturnType<typeof fetchTags>>;
	counts: Awaited<ReturnType<typeof fetchCounts>>;
} | null> {
	const page = await fetchPageBasicBySlug(slug);
	if (!page) return null;

	const [tags, counts] = await Promise.all([
		fetchTags(page.id),
		fetchCounts(page.id),
	]);
	return { page, tags, counts };
}
