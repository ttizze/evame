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

function createPageSegmentsSelect(
	onlyTitle?: boolean,
	locale?: string,
	currentUserId?: string,
) {
	return {
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

function createTagPagesSelect() {
	return {
		tagPages: {
			include: {
				tag: true,
			},
		},
	};
}
export function createPageWithRelationsForPageListSelect(
	onlyTitle?: boolean,
	locale?: string,
) {
	return {
		id: true,
		slug: true,
		createdAt: true,
		status: true,
		user: {
			select: createUserSelectFields(),
		},
		...createPageSegmentsSelect(onlyTitle, locale),
		...createTagPagesSelect(),
		_count: {
			select: {
				pageComments: true,
			},
		},
	};
}

type PageWithRelationsSelect = Prisma.PageGetPayload<{
	select: ReturnType<typeof createPageWithRelationsForPageListSelect>;
}>;
export type PagesWithRelations = Omit<
	PageWithRelations,
	"content" | "updatedAt" | "userId" | "sourceLocale"
>;

export async function transformToPageWithSegmentAndTranslations(
	page: PageWithRelationsSelect,
): Promise<PagesWithRelations> {
	const segmentWithTranslations = await Promise.all(
		page.pageSegments.map(async (segment) => {
			const segmentTranslationsWithVotes = segment.pageSegmentTranslations.map(
				(translation) => ({
					...translation,
					translationCurrentUserVote: null,
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
	onlyUserOwn?: boolean;
	locale?: string;
	currentUserId?: string;
};

export async function fetchPaginatedPublicPagesWithInfo({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	isPopular = false,
	onlyUserOwn = false,
	locale = "en",
}: FetchParams): Promise<{
	pagesWithRelations: PagesWithRelations[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	// 共通フィルタ
	const baseWhere: Prisma.PageWhereInput = {
		status: "PUBLIC",
		pageSegments: { some: { number: 0 } },
	};

	// 所有者のみ表示したい場合
	if (onlyUserOwn && pageOwnerId) {
		baseWhere.userId = pageOwnerId;
	}

	// ソート条件
	let orderBy:
		| Prisma.PageOrderByWithRelationInput
		| Prisma.PageOrderByWithRelationInput[];
	if (isPopular) {
		orderBy = [{ likePages: { _count: "desc" } }, { createdAt: "desc" }];
	} else {
		// 新着順（全体）
		orderBy = { createdAt: "desc" };
	}

	// 実際に使うselectを生成 (localeなどを含む)
	const pageWithRelationsSelect = createPageWithRelationsForPageListSelect(
		true,
		locale,
	);

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
			user: {
				select: createUserSelectFields(),
			},
			...createPageSegmentsSelect(false, locale, currentUserId),
			...createTagPagesSelect(),
		},
	});

	if (!page) return null;

	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentWithTranslations: await Promise.all(
			page.pageSegments.map(async (segment) => {
				const segmentTranslationsWithVotes =
					segment.pageSegmentTranslations.map((segmentTranslation) => ({
						...segmentTranslation,
						translationCurrentUserVote:
							segmentTranslation.votes && segmentTranslation.votes.length > 0
								? {
										...segmentTranslation.votes[0],
										translationId: segmentTranslation.id,
									}
								: null,
					}));

				const bestSegmentTranslationWithVote = await getBestTranslation(
					segmentTranslationsWithVotes,
				);

				return {
					...segment,
					segmentTranslationsWithVotes,
					bestSegmentTranslationWithVote,
				};
			}),
		),
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
