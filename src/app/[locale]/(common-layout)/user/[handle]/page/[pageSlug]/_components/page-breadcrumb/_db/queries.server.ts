import { getPageById } from "@/app/[locale]/_db/queries.server";
import type { SegmentForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { db } from "@/db";

type ParentNode = {
	id: number;
	slug: string;
	order: number;
	sourceLocale: string;
	status: string;
	parentId: number | null;
	createdAt: string;
	user: SanitizedUser;
	content: { segments: SegmentForList[] };
	children: ParentNode[];
};

// 親ページの階層を取得する関数
export async function getParentChain(pageId: number, locale: string) {
	const parentChain: ParentNode[] = [];
	let currentParentId = await getParentId(pageId);

	while (currentParentId) {
		// ページ基本情報を取得
		const parent = await getPageById(currentParentId);
		if (!parent) {
			break;
		}

		// セグメント（number: 0のみ）を取得
		const segments = await fetchTitleSegment(parent.id, locale);

		parentChain.unshift({
			id: parent.id,
			slug: parent.slug,
			order: parent.order,
			sourceLocale: parent.sourceLocale,
			status: parent.status,
			parentId: parent.parentId,
			createdAt: parent.createdAt.toISOString(),
			user: parent.user,
			content: {
				segments: segments ? [segments] : [],
			},
			children: [],
		});

		currentParentId = parent.parentId;
	}

	return parentChain;
}

// ページの親IDを取得する関数
async function getParentId(pageId: number): Promise<number | null> {
	const result = await db
		.selectFrom("pages")
		.select("parentId")
		.where("id", "=", pageId)
		.executeTakeFirst();
	return result?.parentId ?? null;
}

// タイトルセグメント（number: 0）を取得
async function fetchTitleSegment(
	pageId: number,
	locale: string,
): Promise<SegmentForList | null> {
	const row = await db
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
		.where("segments.number", "=", 0)
		.executeTakeFirst();

	if (!row) return null;

	return {
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
	};
}
