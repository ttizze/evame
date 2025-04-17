import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBestTranslation } from "../_lib/get-best-translation";
import type { PageWithRelations, ProjectWithRelations } from "../types";

// Project and Page queries implementation

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
	currentUserId?: string,
) {
	return {
		id: true,
		slug: true,
		createdAt: true,
		status: true,
		...createPageRelatedFields(onlyTitle, locale, currentUserId),
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
) {
	return Promise.all(
		segments.map(async (segment) => {
			const segmentTranslationsWithVotes = segment.pageSegmentTranslations.map(
				(translation) => ({
					...translation,
					translationCurrentUserVote:
						translation.votes && translation.votes.length > 0
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

export async function transformToPageWithSegmentAndTranslations(
	page: PageWithRelationsSelect,
): Promise<PagesWithRelations> {
	const segmentWithTranslations = await transformPageSegments(
		page.pageSegments,
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
	currentUserId?: string;
};

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
	);
	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentWithTranslations,
	};
}

export async function fetchPaginatedPublicPagesWithRelations({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	isPopular = false,
	locale = "en",
	currentUserId,
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
	const pageWithRelationsSelect = createPagesWithRelationsSelect(
		true,
		locale,
		currentUserId,
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

// Project related functions
function createProjectRelatedFields(
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) {
	return {
		user: {
			select: createUserSelectFields(),
		},
		projectTagRelations: {
			include: {
				projectTag: true,
			},
		},
		links: true,
		images: {
			orderBy: { order: Prisma.SortOrder.asc },
		},
		projectSegments: {
			where: onlyTitle ? { number: 0 } : undefined,
			include: {
				projectSegmentTranslations: {
					where: { locale, isArchived: false },
					include: {
						user: {
							select: createUserSelectFields(),
						},
						...(currentUserId && {
							projectSegmentTranslationVotes: {
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

export function createProjectsWithRelationsSelect(
	onlyTitle = false,
	locale = "en",
	currentUserId?: string,
) {
	return {
		id: true,
		title: true,
		createdAt: true,
		updatedAt: true,
		...createProjectRelatedFields(onlyTitle, locale, currentUserId),
		_count: {
			select: {
				projectLikes: true,
			},
		},
	};
}

type ProjectWithRelationsSelect = Prisma.ProjectGetPayload<{
	select: ReturnType<typeof createProjectsWithRelationsSelect>;
}>;
export type ProjectWithRelationsForList = Omit<
	ProjectWithRelations,
	"description" | "userId" | "sourceLocale"
>;

export async function transformProjectSegments(
	segments: ProjectWithRelationsSelect["projectSegments"],
) {
	return Promise.all(
		segments.map(async (segment) => {
			const segmentTranslationsWithVotes =
				segment.projectSegmentTranslations.map((translation) => ({
					...translation,
					translationCurrentUserVote:
						translation.projectSegmentTranslationVotes &&
						translation.projectSegmentTranslationVotes.length > 0
							? {
									...translation.projectSegmentTranslationVotes[0],
									translationId: translation.id,
								}
							: null,
				}));

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

export async function transformToProjectWithSegmentAndTranslations(
	project: ProjectWithRelationsSelect,
): Promise<ProjectWithRelationsForList> {
	const segmentWithTranslations = await transformProjectSegments(
		project.projectSegments,
	);

	return {
		...project,
		createdAt: project.createdAt.toISOString(),
		segmentWithTranslations,
	};
}

type FetchProjectParams = {
	page?: number;
	pageSize?: number;
	projectOwnerId?: string;
	isPopular?: boolean;
	locale?: string;
	currentUserId?: string;
	tagIds?: string[];
};

export async function fetchPaginatedProjectsWithRelations({
	page = 1,
	pageSize = 9,
	projectOwnerId,
	isPopular = false,
	locale = "en",
	currentUserId,
	tagIds,
}: FetchProjectParams): Promise<{
	projectsWithRelations: ProjectWithRelationsForList[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	// 共通フィルタ
	const baseWhere: Prisma.ProjectWhereInput = {};

	// 所有者のみ表示したい場合
	if (projectOwnerId) {
		baseWhere.userId = projectOwnerId;
	}

	// タグでフィルタリングする場合
	if (tagIds && tagIds.length > 0) {
		baseWhere.projectTagRelations = {
			some: {
				projectTagId: {
					in: tagIds,
				},
			},
		};
	}

	const orderBy = isPopular
		? [
				{ projectLikes: { _count: Prisma.SortOrder.desc } },
				{ createdAt: Prisma.SortOrder.desc },
			]
		: { createdAt: Prisma.SortOrder.desc };

	// 実際に使うselectを生成 (localeなどを含む)
	const projectWithRelationsSelect = createProjectsWithRelationsSelect(
		true,
		locale,
		currentUserId,
	);

	// findManyとcountを同時並列で呼び出し
	const [rawProjectsWithRelations, totalCount] = await Promise.all([
		prisma.project.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select: {
				...projectWithRelationsSelect,
			},
		}),
		prisma.project.count({
			where: baseWhere,
		}),
	]);

	// Transform each project to include segmentWithTranslations
	const projectsWithRelations = await Promise.all(
		rawProjectsWithRelations.map((project) =>
			transformToProjectWithSegmentAndTranslations(project),
		),
	);

	return {
		projectsWithRelations,
		totalPages: Math.ceil(totalCount / pageSize),
	};
}

export async function fetchProjectWithTranslations(
	projectId: string,
	locale: string,
	currentUserId?: string,
): Promise<ProjectWithRelations | null> {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: {
			...createProjectRelatedFields(false, locale, currentUserId),
		},
	});

	if (!project) return null;

	const projectWithSegments = await transformProjectSegments(
		project.projectSegments,
	);

	return {
		...project,
		createdAt: project.createdAt.toISOString(),
		segmentWithTranslations: projectWithSegments,
	};
}

export async function getProjectById(projectId: string) {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});
	return project;
}

export async function fetchLatestProjectAITranslationInfo(projectId: string) {
	const locales = await prisma.projectAITranslationInfo.findMany({
		where: { projectId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.projectAITranslationInfo.findFirst({
				where: {
					projectId,
					locale,
				},
				orderBy: { createdAt: "desc" },
			}),
		),
	);

	// nullでないレコードのみを返す
	return results.filter((record) => record !== null);
}
