import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getBestTranslation } from "../lib/get-best-translation";
import type { PageWithTranslations } from "../types";

export function createPageCardSelect(locale?: string) {
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

export type PageCardType = Prisma.PageGetPayload<{
	select: ReturnType<typeof createPageCardSelect>;
}>;

export type PageCardLocalizedType = Omit<PageCardType, "createdAt"> & {
	createdAt: string;
};

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
	pagesWithInfo: PageCardLocalizedType[];
	totalPages: number;
	currentPage: number;
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
	let orderBy: Prisma.PageOrderByWithRelationInput | Prisma.PageOrderByWithRelationInput[];
  if (isRecommended) {
    orderBy = [
      { createdAt: "desc" },
      { likePages: { _count: "desc" } },
    ];
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
	const pageCardSelect = createPageCardSelect(locale);

	// findManyとcountを同時並列で呼び出し
	const [pages, totalCount] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select: {
				...pageCardSelect,
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
	// 日付をロケール指定した文字列へ変換
	const pagesWithInfo: PageCardLocalizedType[] = pages.map((p) => ({
		...p,
		createdAt: new Date(p.createdAt).toLocaleDateString(locale),
	}));

	return {
		pagesWithInfo,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
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

	const titleText = await prisma.pageSegment.findFirst({
		where: {
			pageId: page.id,
			number: 0,
		},
		include: {
			pageSegmentTranslations: {
				where: { isArchived: false },
				select: { locale: true },
			},
		},
	});

	const existLocales = titleText
		? Array.from(
				new Set(titleText.pageSegmentTranslations.map((t) => t.locale)),
			)
		: [];
	const { user, ...pageWithoutUser } = page;
	return {
		page: {
			...pageWithoutUser,
			createdAt: page.createdAt.toLocaleString(locale),
		},
		user,
		tagPages: page.tagPages,
		segmentWithTranslations: page.pageSegments.map((segment) => {
			const segmentTranslationsWithVotes = segment.pageSegmentTranslations.map(
				(segmentTranslation) => ({
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
				}),
			);

			const bestSegmentTranslationWithVote = getBestTranslation(
				segmentTranslationsWithVotes,
			);

			return {
				segment,
				segmentTranslationsWithVotes,
				bestSegmentTranslationWithVote,
			};
		}),
		existLocales,
	};
}

export async function getPageById(pageId: number) {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
	});
	return page;
}
