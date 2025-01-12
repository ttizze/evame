import type { Prisma } from "@prisma/client";
import { prisma } from "~/utils/prisma";

export function createPageCardSelect(locale?: string) {
	return {
		id: true,
		slug: true,
		isPublished: true,
		createdAt: true,
		user: {
			select: {
				userName: true,
				displayName: true,
				icon: true,
				profile: true,
			},
		},
		sourceTexts: {
			where: { number: 0 },
			select: {
				number: true,
				text: true,
				translateTexts: {
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
	currentUserId?: number;
	currentGuestId?: string;
	pageOwnerId?: number;
	isRecommended?: boolean;
	onlyUserOwn?: boolean;
	locale?: string;
};

export async function fetchPaginatedPagesWithInfo({
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
		isArchived: false,
		isPublished: true,
		sourceTexts: { some: { number: 0 } },
	};

	// 所有者のみ表示したい場合
	if (onlyUserOwn && pageOwnerId) {
		baseWhere.userId = pageOwnerId;
	}

	// ソート条件
	let orderBy: Prisma.PageOrderByWithRelationInput;
	if (isRecommended) {
		// いいね数が多い順
		orderBy = {
			likePages: {
				_count: "desc",
			},
		};
	} else {
		// 新着順
		orderBy = { createdAt: "desc" };
	}

	// いいね判定用where句 (ログインユーザ or ゲストID)
	let likeWhere: Prisma.LikePageWhereInput;
	if (currentUserId) {
		likeWhere = { userId: currentUserId };
	} else if (currentGuestId) {
		likeWhere = { guestId: currentGuestId };
	} else {
		throw new Error("User ID or Guest ID is required");
	}

	// 実際に使うselectを生成 (translateTexts.localeなどを含む)
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
