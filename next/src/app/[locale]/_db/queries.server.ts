import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBestTranslation } from "../_lib/get-best-translation";
import type { PageWithRelations, SegmentWithTranslations } from "../types";

export function createPageWithRelationsSelect(locale?: string) {
	return {
		id: true,
		slug: true,
		createdAt: true,
		status: true,
		user: {
			select: {
				handle: true,
				name: true,
				image: true,
				profile: true,
			},
		},
		pageSegments: {
			where: { number: 0 },
			include: {
				pageSegmentTranslations: {
					where: { locale, isArchived: false },
					include: {
						user: {
							select: {
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
							},
						},
					},
					orderBy: [
						{ point: Prisma.SortOrder.desc },
						{ createdAt: Prisma.SortOrder.desc },
					],
				},
			},
		},
		tagPages: {
			select: {
				tag: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		},
		_count: {
			select: {
				pageComments: true,
			},
		},
	};
}

export type PageWithRelationsSelectType = Prisma.PageGetPayload<{
	select: ReturnType<typeof createPageWithRelationsSelect>;
}>;
export type PageWithRelationsListType = Omit<
	PageWithRelationsSelectType,
	"createdAt" | "pageSegments"
> & {
	createdAt: string;
	segmentWithTranslations: SegmentWithTranslations[];
};
// Transform the PageWithRelationsType to include segmentWithTranslations
export async function transformToPageWithSegmentAndTranslations(
	page: PageWithRelationsSelectType,
): Promise<
	Omit<PageWithRelationsSelectType, "createdAt"> & {
		createdAt: string;
		segmentWithTranslations: SegmentWithTranslations[];
	}
> {
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
	pagesWithRelations: PageWithRelationsListType[];
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
	const pageWithRelationsSelect = createPageWithRelationsSelect(locale);

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
				select: {
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
				},
			},
			pageSegments: {
				include: {
					pageSegmentTranslations: {
						where: { locale, isArchived: false },
						include: {
							user: {
								select: {
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
								},
							},
							votes: {
								where: currentUserId
									? { userId: currentUserId }
									: { userId: "0" },
							},
						},
						orderBy: [{ point: "desc" }, { createdAt: "desc" }],
					},
				},
			},
			tagPages: {
				include: {
					tag: true,
				},
			},
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
