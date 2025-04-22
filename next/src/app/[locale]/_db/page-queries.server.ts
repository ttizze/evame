import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { toSegmentBundles } from "../_lib/to-segment-bundles";
import type { PageDetail, PageSummary } from "../types";
import { selectUserFields } from "./queries.server";

const selectPageRelatedFields = (
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) => {
	return {
		user: {
			select: selectUserFields(),
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
							select: selectUserFields(),
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
};

export const selectPagesWithDetails = (
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) => {
	return {
		id: true,
		slug: true,
		createdAt: true,
		status: true,
		sourceLocale: true,
		...selectPageRelatedFields(onlyTitle, locale, currentUserId),
		_count: {
			select: {
				pageComments: true,
			},
		},
	};
};

type FetchParams = {
	page?: number;
	pageSize?: number;
	pageOwnerId?: string;
	isPopular?: boolean;
	locale?: string;
	currentUserId?: string;
};

export function normalizePageSegments(
	pageSegments: {
		id: number;
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		pageSegmentTranslations: {
			id: number;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
			user: SanitizedUser;
			votes?: { isUpvote: boolean; updatedAt: Date }[];
		}[];
	}[],
) {
	return pageSegments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		textAndOccurrenceHash: seg.textAndOccurrenceHash,
		segmentTranslations: seg.pageSegmentTranslations.map((t) => ({
			...t,
			currentUserVote: t.votes?.[0] ?? null,
		})),
	}));
}

export async function fetchPageDetail(
	slug: string,
	locale: string,
	currentUserId?: string,
): Promise<PageDetail | null> {
	const page = await prisma.page.findFirst({
		where: { slug },
		include: {
			...selectPageRelatedFields(false, locale, currentUserId),
		},
	});

	if (!page) return null;

	const normalized = await normalizePageSegments(page.pageSegments);
	const segmentBundles = await toSegmentBundles("page", page.id, normalized);
	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentBundles,
	};
}

export async function fetchPaginatedPublicPageSummaries({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	isPopular = false,
	locale = "en",
	currentUserId,
}: FetchParams): Promise<{
	pageSummaries: PageSummary[];
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

	const select = selectPagesWithDetails(true, locale, currentUserId);

	const [rawPages, total] = await Promise.all([
		prisma.page.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select,
		}),
		prisma.page.count({ where: baseWhere }),
	]);

	// ---------------- DTO 変換 ----------------
	const pages = rawPages.map((p) => ({
		...p,
		createdAt: p.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"page",
			p.id,
			normalizePageSegments(p.pageSegments),
		),
	}));

	return {
		pageSummaries: pages,
		totalPages: Math.ceil(total / pageSize),
	};
}
export async function fetchLatestPageTranslationJobs(pageId: number) {
	const locales = await prisma.translationJob.findMany({
		where: { pageId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 2. 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.translationJob.findFirst({
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
