import { Prisma } from "@prisma/client";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	pages,
	segments,
	segmentTranslations,
	segmentTypes,
	users,
} from "@/drizzle/schema";

// Prisma版（後方互換性のため残す）
export const selectUserFields = () => {
	return {
		id: true,
		name: true,
		handle: true,
		image: true,
		createdAt: true,
		updatedAt: true,
		profile: true,
		twitterHandle: true,
		totalPoints: true,
		isAI: true,
		plan: true,
	};
};

// Drizzle版: ユーザーフィールドのselectオブジェクトを返す
export const selectUserFieldsDrizzle = () => ({
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
});

// Prisma版（後方互換性のため残す）
export const selectSegmentFields = (locale: string) => ({
	id: true,
	number: true,
	text: true,
	segmentType: {
		select: {
			key: true,
			label: true,
		},
	},
	...selectSegmentTranslations(locale),
});

// Drizzle版: セグメントフィールドのselectオブジェクトを返す
// 注意: Prisma版とは異なり、セグメント翻訳は別途取得して結合する必要があります
// セグメント翻訳を取得する場合は、selectSegmentTranslationsDrizzle()を使用してください
export const selectSegmentFieldsDrizzle = () => ({
	id: segments.id,
	number: segments.number,
	text: segments.text,
	segmentType: {
		key: segmentTypes.key,
		label: segmentTypes.label,
	},
});
// Prisma版: locale ごとの最適化済み segmentTranslations を取得する include/select ビルダー
const selectSegmentTranslations = (locale: string) => ({
	segmentTranslations: {
		where: { locale },
		select: {
			segmentId: true,
			userId: true,
			id: true,
			locale: true,
			text: true,
			point: true,
			createdAt: true,
			user: { select: selectUserFields() },
		},
		orderBy: [
			{ point: Prisma.SortOrder.desc },
			{ createdAt: Prisma.SortOrder.desc },
		],
		take: 1,
	},
});

// Drizzle版: セグメント翻訳フィールドのselectオブジェクトを返す
// 注意: Prisma版とは異なり、where条件（localeなど）は実際のクエリで指定する必要があります
// 例: .where(eq(segmentTranslations.locale, locale))
export const selectSegmentTranslationsDrizzle = () => ({
	id: segmentTranslations.id,
	segmentId: segmentTranslations.segmentId,
	userId: segmentTranslations.userId,
	locale: segmentTranslations.locale,
	text: segmentTranslations.text,
	point: segmentTranslations.point,
	createdAt: segmentTranslations.createdAt,
	user: selectUserFieldsDrizzle(),
});

// Prisma版（後方互換性のため残す）
const basePageFieldSelect = {
	id: true,
	slug: true,
	createdAt: true,
	status: true,
	sourceLocale: true,
	parentId: true,
	order: true,
	user: {
		select: selectUserFields(),
	},
} as const;

// Drizzle版: ページ基本フィールドのselectオブジェクトを返す
export const basePageFieldSelectDrizzle = () => ({
	id: pages.id,
	slug: pages.slug,
	createdAt: pages.createdAt,
	status: pages.status,
	sourceLocale: pages.sourceLocale,
	parentId: pages.parentId,
	order: pages.order,
	user: selectUserFieldsDrizzle(),
});

// Prisma版（後方互換性のため残す）
const buildPageSelect = (locale: string, where?: Prisma.SegmentWhereInput) =>
	({
		...basePageFieldSelect,
		content: {
			select: {
				segments: {
					...(where ? { where } : {}),
					select: selectSegmentFields(locale),
				},
			},
		},
	}) as const;

// Drizzle版: ページとセグメントフィールドのselectオブジェクトを返す
// 注意: Prisma版とは異なり、セグメントは別途取得して結合する必要があります
// セグメントを取得する場合は、実際のクエリでsegmentsテーブルをJOINしてください
export const buildPageSelectDrizzle = () => ({
	...basePageFieldSelectDrizzle(),
	// セグメントは別途取得して結合する必要があります
	// 例: .leftJoin(segments, eq(segments.contentId, pages.id))
});

// Prisma版（後方互換性のため残す）
const buildPageSelectWithAnnotations = (
	locale: string,
	where?: Prisma.SegmentWhereInput,
) =>
	({
		...basePageFieldSelect,
		content: {
			select: {
				segments: {
					where: {
						...(where || {}),
						segmentType: { key: "PRIMARY" },
					},
					orderBy: { number: "asc" },
					select: {
						...selectSegmentFields(locale),
						annotations: {
							select: {
								annotationSegment: {
									select: selectSegmentFields(locale),
								},
							},
						},
					},
				},
			},
		},
	}) as const;

// Drizzle版: ページとセグメント（注釈付き）フィールドのselectオブジェクトを返す
// 注意: Prisma版とは異なり、セグメントと注釈は別途取得して結合する必要があります
// セグメントを取得する場合は、実際のクエリでsegmentsテーブルをJOINし、
// segmentType.key = 'PRIMARY'でフィルタリングし、numberでソートしてください
// 注釈はsegmentAnnotationLinksテーブルをJOINして取得してください
export const buildPageSelectWithAnnotationsDrizzle = () => ({
	...basePageFieldSelectDrizzle(),
	// セグメントと注釈は別途取得して結合する必要があります
	// 例: .leftJoin(segments, and(eq(segments.contentId, pages.id), eq(segmentTypes.key, 'PRIMARY')))
	//     .leftJoin(segmentAnnotationLinks, eq(segmentAnnotationLinks.mainSegmentId, segments.id))
});

export function selectPageFields(
	locale?: string,
	where?: Prisma.SegmentWhereInput,
	includeAnnotations?: false,
): ReturnType<typeof buildPageSelect>;
export function selectPageFields(
	locale: string | undefined,
	where: Prisma.SegmentWhereInput | undefined,
	includeAnnotations: true,
): ReturnType<typeof buildPageSelectWithAnnotations>;
export function selectPageFields(
	locale = "en",
	where?: Prisma.SegmentWhereInput,
	includeAnnotations = false,
) {
	if (includeAnnotations) {
		return buildPageSelectWithAnnotations(locale, where);
	}
	return buildPageSelect(locale, where);
}

/**
 * ページIDでページとユーザー情報を取得
 * Drizzleに移行済み
 *
 * 返却構造: ページオブジェクトにuserをネストして返す
 * これにより、page.user.nameのようにアクセスでき、ドメインモデルとの整合性が保たれる
 */
export async function getPageById(pageId: number) {
	const result = await db
		.select({
			page: pages,
			user: selectUserFieldsDrizzle(),
		})
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
		.where(eq(pages.id, pageId))
		.limit(1);

	if (!result[0]) return null;

	// ドメインモデルに合わせて、userをページオブジェクト内にネストして返す
	return {
		...result[0].page,
		user: result[0].user,
	};
}
