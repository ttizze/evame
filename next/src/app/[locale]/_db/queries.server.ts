import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getBestTranslation } from "../_lib/get-best-translation";
import type { PageWithTranslations } from "../types";

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
			select: {
				number: true,
				text: true,
				pageSegmentTranslations: {
					where: locale ? { locale } : {},
					select: {
						text: true,
					},
				},
			},
		},
		likePages: {
			select: {
				userId: true,
				guestId: true,
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
				likePages: true,
			},
		},
	};
}

export type PageWithRelationsType = Prisma.PageGetPayload<{
	select: ReturnType<typeof createPageWithRelationsSelect>;
}>;

type FetchParams = {
	page?: number;
	pageSize?: number;
	currentUserId?: string;
	currentGuestId?: string;
	pageOwnerId?: string;
	isRecommended?: boolean;
	onlyUserOwn?: boolean;
	locale?: string;
};

export async function fetchPaginatedPublicPagesWithInfo({
	page = 1,
	pageSize = 9,
	currentUserId,
	currentGuestId,
	pageOwnerId,
	isRecommended = false,
	onlyUserOwn = false,
	locale = "en",
}: FetchParams): Promise<{
	pagesWithRelations: PageWithRelationsType[];
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
	if (isRecommended) {
		orderBy = [{ createdAt: "desc" }, { likePages: { _count: "desc" } }];
	} else {
		// 新着順（全体）
		orderBy = { createdAt: "desc" };
	}

	// いいね判定用where句 (ログインユーザ or ゲストID)
	let likeWhere: Prisma.LikePageWhereInput;
	if (currentUserId) {
		likeWhere = { userId: currentUserId };
	} else if (currentGuestId) {
		likeWhere = { guestId: currentGuestId };
	} else {
		likeWhere = { userId: "null" };
	}

	// 実際に使うselectを生成 (localeなどを含む)
	const pageWithRelationsSelect = createPageWithRelationsSelect(locale);

	// findManyとcountを同時並列で呼び出し
	const [pagesWithRelations, totalCount] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select: {
				...pageWithRelationsSelect,
				likePages: {
					where: likeWhere,
					select: {
						userId: true,
						guestId: true,
					},
				},
			},
		}),
		prisma.page.count({
			where: baseWhere,
		}),
	]);

	return {
		pagesWithRelations,
		totalPages: Math.ceil(totalCount / pageSize),
	};
}

export async function fetchPageWithTranslations(
	slug: string,
	locale: string,
	currentUserId?: string,
): Promise<PageWithTranslations | null> {
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

	const { user, ...pageWithoutUser } = page;
	return {
		page: {
			...pageWithoutUser,
			createdAt: page.createdAt.toLocaleString(locale),
		},
		user,
		tagPages: page.tagPages,
		segmentWithTranslations: await Promise.all(
			page.pageSegments.map(async (segment) => {
				const segmentTranslationsWithVotes =
					segment.pageSegmentTranslations.map((segmentTranslation) => ({
						segmentTranslation: {
							...segmentTranslation,
							user: segmentTranslation.user,
						},
						translationVote:
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
					segment,
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
