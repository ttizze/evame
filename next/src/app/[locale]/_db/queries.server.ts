import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBestTranslation } from "../_lib/get-best-translation";
import type { PageWithRelations } from "../types";

function createUserSelectFields() {
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
	};
}

function createPageRelatedFields(
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) {
	return {
		user: {
			select: createUserSelectFields(),
		},
		tagPages: {
			include: {
				tag: true,
			},
		},
		pageSegments: {
			where: onlyTitle ? { number: 0 } : undefined,
			include: {
				pageSegmentTranslations: {
					where: { locale, isArchived: false },
					include: {
						user: {
							select: createUserSelectFields(),
						},
						...(currentUserId && {
							votes: {
								where: { userId: currentUserId },
							},
						}),
					},
					orderBy: [
						{ point: Prisma.SortOrder.desc },
						{ createdAt: Prisma.SortOrder.desc },
					],
				},
			},
		},
	};
}

export function createPagesWithRelationsSelect(
	onlyTitle = false,
	locale = "en",
) {
	return {
		id: true,
		slug: true,
		createdAt: true,
		status: true,
		...createPageRelatedFields(onlyTitle, locale),
		_count: {
			select: {
				pageComments: true,
			},
		},
	};
}

type PageWithRelationsSelect = Prisma.PageGetPayload<{
	select: ReturnType<typeof createPagesWithRelationsSelect>;
}>;
export type PagesWithRelations = Omit<
	PageWithRelations,
	"content" | "updatedAt" | "userId" | "sourceLocale"
>;

export async function transformPageSegments(
	segments: PageWithRelationsSelect["pageSegments"],
	includeUserVotes = false,
) {
	return Promise.all(
		segments.map(async (segment) => {
			const segmentTranslationsWithVotes = segment.pageSegmentTranslations.map(
				(translation) => ({
					...translation,
					translationCurrentUserVote:
						includeUserVotes &&
						translation.votes &&
						translation.votes.length > 0
							? {
									...translation.votes[0],
									translationId: translation.id,
								}
							: null,
				}),
			);

			const bestSegmentTranslationWithVote = await getBestTranslation(
				segmentTranslationsWithVotes,
			);

			return {
				id: segment.id,
				number: segment.number,
				text: segment.text,
				segmentTranslationsWithVotes,
				bestSegmentTranslationWithVote,
			};
		}),
	);
}

// 既存の関数を修正
export async function transformToPageWithSegmentAndTranslations(
	page: PageWithRelationsSelect,
): Promise<PagesWithRelations> {
	const segmentWithTranslations = await transformPageSegments(
		page.pageSegments,
		false,
	);

	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentWithTranslations,
	};
}
type FetchParams = {
	page?: number;
	pageSize?: number;
	pageOwnerId?: string;
	isPopular?: boolean;
	locale?: string;
};

export async function fetchPaginatedPublicPagesWithRelations({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	isPopular = false,
	locale = "en",
}: FetchParams): Promise<{
	pagesWithRelations: PagesWithRelations[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	// 共通フィルタ
	const baseWhere: Prisma.PageWhereInput = {
		status: "PUBLIC",
	};

	// 所有者のみ表示したい場合
	if (pageOwnerId) {
		baseWhere.userId = pageOwnerId;
	}

	const orderBy = isPopular
		? [
				{ likePages: { _count: Prisma.SortOrder.desc } },
				{ createdAt: Prisma.SortOrder.desc },
			]
		: { createdAt: Prisma.SortOrder.desc };

	// 実際に使うselectを生成 (localeなどを含む)
	const pageWithRelationsSelect = createPagesWithRelationsSelect(true, locale);

	// findManyとcountを同時並列で呼び出し
	const [rawPagesWithRelations, totalCount] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select: {
				...pageWithRelationsSelect,
			},
		}),
		prisma.page.count({
			where: baseWhere,
		}),
	]);

	// Transform each page to include segmentWithTranslations
	const pagesWithRelations = await Promise.all(
		rawPagesWithRelations.map((page) =>
			transformToPageWithSegmentAndTranslations(page),
		),
	);

	return {
		pagesWithRelations,
		totalPages: Math.ceil(totalCount / pageSize),
	};
}

export async function fetchPageWithTranslations(
	slug: string,
	locale: string,
	currentUserId?: string,
): Promise<PageWithRelations | null> {
	const page = await prisma.page.findFirst({
		where: { slug },
		include: {
			...createPageRelatedFields(false, locale, currentUserId),
		},
	});

	if (!page) return null;

	const segmentWithTranslations = await transformPageSegments(
		page.pageSegments,
		true,
	);
	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentWithTranslations,
	};
}

export async function getPageById(pageId: number) {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
	});
	return page;
}

export async function fetchLatestPageAITranslationInfo(pageId: number) {
	const locales = await prisma.pageAITranslationInfo.findMany({
		where: { pageId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 2. 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.pageAITranslationInfo.findFirst({
				where: {
					pageId,
					locale,
				},
				orderBy: { createdAt: "desc" },
			}),
		),
	);

	// nullでないレコードのみを返す
	return results.filter((record) => record !== null);
}
