import { db } from "@/db/kysely";

// ユーザーフィールドの型定義（実際の値の型を使用）
export type UserFields = {
	id: string;
	name: string;
	handle: string;
	image: string;
	createdAt: string;
	updatedAt: string;
	profile: string;
	twitterHandle: string;
	totalPoints: number;
	isAi: number;
	plan: string;
};

// セグメント翻訳の型定義
export type SegmentTranslationWithUser = {
	id: number;
	segmentId: number;
	userId: string;
	locale: string;
	text: string;
	point: number;
	createdAt: string;
	user: UserFields;
};

// セグメントタイプの型定義
export type SegmentTypeFields = {
	key: string;
	label: string;
};

// セグメントの型定義
export type SegmentFields = {
	id: number;
	number: number;
	text: string;
	segmentType: SegmentTypeFields;
	segmentTranslations?: SegmentTranslationWithUser[];
};

// ページの型定義
export type PageFields = {
	id: number;
	slug: string;
	createdAt: string;
	status: string;
	sourceLocale: string;
	parentId: number | null;
	order: number;
	user: UserFields;
	content?: {
		segments?: SegmentFields[];
	};
};

// Prisma の selectPageFields/selectSegmentFields の互換性のための型定義
// 実際の使用は page-list-queries.server.ts や fetch-page-detail.server.ts の書き換え時に実装
export type SelectPageFieldsResult = PageFields;
export type SelectSegmentFieldsResult = SegmentFields;

// 互換性のための関数（実際の実装は後で追加）
// 現時点では型定義のみ提供
export function selectPageFields(
	locale?: string,
	where?: unknown,
	includeAnnotations?: boolean,
): SelectPageFieldsResult {
	throw new Error(
		"selectPageFields is not implemented for Kysely. Use actual query functions instead.",
	);
}

export function selectSegmentFields(
	locale: string,
): SelectSegmentFieldsResult {
	throw new Error(
		"selectSegmentFields is not implemented for Kysely. Use actual query functions instead.",
	);
}

export function selectUserFields(): UserFields {
	throw new Error(
		"selectUserFields is not implemented for Kysely. Use actual query functions instead.",
	);
}

/**
 * ページをIDで取得（ユーザー情報を含む）
 */
export async function getPageById(pageId: number) {
	const page = await db
		.selectFrom("pages")
		.innerJoin("users", "users.id", "pages.userId")
		.select([
			"pages.id",
			"pages.slug",
			"pages.createdAt",
			"pages.status",
			"pages.sourceLocale",
			"pages.parentId",
			"pages.order",
			"users.id as userId",
			"users.name",
			"users.handle",
			"users.image",
			"users.createdAt as userCreatedAt",
			"users.updatedAt",
			"users.profile",
			"users.twitterHandle",
			"users.totalPoints",
			"users.isAi",
			"users.plan",
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	if (!page) {
		return null;
	}

	return {
		id: page.id,
		slug: page.slug,
		createdAt: page.createdAt,
		status: page.status,
		sourceLocale: page.sourceLocale,
		parentId: page.parentId,
		order: page.order,
		user: {
			id: page.userId,
			name: page.name,
			handle: page.handle,
			image: page.image,
			createdAt: page.userCreatedAt,
			updatedAt: page.updatedAt,
			profile: page.profile,
			twitterHandle: page.twitterHandle,
			totalPoints: page.totalPoints,
			isAi: page.isAi,
			plan: page.plan,
		},
	};
}

/**
 * セグメントとその翻訳を取得（最適な翻訳1件のみ）
 */
export async function getSegmentWithBestTranslation(
	segmentId: number,
	locale: string,
): Promise<SegmentFields | null> {
	const segment = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segmentTypes.id", "segments.segmentTypeId")
		.select([
			"segments.id",
			"segments.number",
			"segments.text",
			"segmentTypes.key",
			"segmentTypes.label",
		])
		.where("segments.id", "=", segmentId)
		.executeTakeFirst();

	if (!segment) {
		return null;
	}

	// 最適な翻訳を取得（point desc, createdAt desc で1件）
	const translation = await db
		.selectFrom("segmentTranslations")
		.innerJoin("users", "users.id", "segmentTranslations.userId")
		.select([
			"segmentTranslations.id",
			"segmentTranslations.segmentId",
			"segmentTranslations.userId",
			"segmentTranslations.locale",
			"segmentTranslations.text",
			"segmentTranslations.point",
			"segmentTranslations.createdAt",
			"users.id as userId",
			"users.name",
			"users.handle",
			"users.image",
			"users.createdAt as userCreatedAt",
			"users.updatedAt",
			"users.profile",
			"users.twitterHandle",
			"users.totalPoints",
			"users.isAi",
			"users.plan",
		])
		.where("segmentTranslations.segmentId", "=", segmentId)
		.where("segmentTranslations.locale", "=", locale)
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc")
		.limit(1)
		.executeTakeFirst();

	const segmentTranslation: SegmentTranslationWithUser | undefined =
		translation
			? {
					id: translation.id,
					segmentId: translation.segmentId,
					userId: translation.userId,
					locale: translation.locale,
					text: translation.text,
					point: translation.point,
					createdAt: translation.createdAt,
					user: {
						id: translation.userId,
						name: translation.name,
						handle: translation.handle,
						image: translation.image,
						createdAt: translation.userCreatedAt,
						updatedAt: translation.updatedAt,
						profile: translation.profile,
						twitterHandle: translation.twitterHandle,
						totalPoints: translation.totalPoints,
						isAi: translation.isAi,
						plan: translation.plan,
					},
				}
			: undefined;

	return {
		id: segment.id,
		number: segment.number,
		text: segment.text,
		segmentType: {
			key: segment.key,
			label: segment.label,
		},
		segmentTranslations: segmentTranslation ? [segmentTranslation] : [],
	};
}
