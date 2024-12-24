import type { Prisma } from "@prisma/client";
import { prisma } from "~/utils/prisma";

const pageCardSelect = {
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
		},
	},
	likePages: {
		select: {
			userId: true,
		},
	},
	_count: {
		select: {
			likePages: true,
		},
	},
} satisfies Prisma.PageSelect;

export type PageCardType = Prisma.PageGetPayload<{
	select: typeof pageCardSelect;
}>;

export type PageCardLocalizedType = Omit<PageCardType, "createdAt"> & {
	createdAt: string;
};

type FetchParams = {
	page?: number;
	pageSize?: number;
	currentUserId?: number;
	pageOwnerId?: number;
	isRecommended?: boolean;
	onlyUserOwn?: boolean;
	locale?: string;
};

export async function fetchPaginatedPagesWithInfo({
	page = 1,
	pageSize = 9,
	currentUserId,
	pageOwnerId,
	isRecommended = false,
	onlyUserOwn = false,
	locale = "en-US",
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

	if (onlyUserOwn && pageOwnerId) {
		baseWhere.userId = pageOwnerId;
	}

	let orderBy: Prisma.PageOrderByWithRelationInput;
	if (isRecommended) {
		orderBy = {
			likePages: {
				_count: "desc",
			},
		};
	} else {
		orderBy = { createdAt: "desc" };
	}

	// findMany & countを同時に呼び出し
	const [pages, totalCount] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select: {
				...pageCardSelect,
				likePages: {
					where: { userId: currentUserId },
					select: { userId: true },
				},
			},
		}),
		prisma.page.count({ where: baseWhere }),
	]);

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
