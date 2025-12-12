import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	pages,
	segments,
	segmentTranslations,
	segmentTypes,
	users,
} from "@/drizzle/schema";

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

/**
 * セグメントと翻訳を取得する際の共通select構造
 * セグメント、セグメントタイプ、翻訳、翻訳ユーザーを含む
 */
export const selectSegmentWithTranslationDrizzle = () => ({
	segment: {
		id: segments.id,
		contentId: segments.contentId,
		number: segments.number,
		text: segments.text,
		textAndOccurrenceHash: segments.textAndOccurrenceHash,
		createdAt: segments.createdAt,
		segmentTypeId: segments.segmentTypeId,
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
	translationUser: selectUserFieldsDrizzle(),
});

// Drizzle版: ページ基本フィールドのselectオブジェクトを返す
export const basePageFieldSelectDrizzle = () => ({
	id: pages.id,
	slug: pages.slug,
	createdAt: pages.createdAt,
	updatedAt: pages.updatedAt,
	status: pages.status,
	sourceLocale: pages.sourceLocale,
	parentId: pages.parentId,
	order: pages.order,
	user: selectUserFieldsDrizzle(),
});

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
			...basePageFieldSelectDrizzle(),
		})
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
		.where(eq(pages.id, pageId))
		.limit(1);

	if (!result[0]) return null;

	// ドメインモデルに合わせて、userをページオブジェクト内にネストして返す
	return result[0] ?? null;
}
