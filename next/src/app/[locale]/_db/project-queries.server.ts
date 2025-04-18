import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { toSegmentBundles } from "../_lib/to-segment-bundles";
import type { ProjectDetail, ProjectSummary } from "../types";
import { createUserSelectFields } from "./queries.server";

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

export function normalizeProjectSegments(
	projectSegments: {
		id: number;
		number: number;
		text: string;
		projectSegmentTranslations: {
			id: number;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
			user: SanitizedUser;
			projectSegmentTranslationVotes?: { isUpvote: boolean; updatedAt: Date }[];
		}[];
	}[],
) {
	return projectSegments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		segmentTranslations: seg.projectSegmentTranslations.map((t) => ({
			...t,
			currentUserVote: t.projectSegmentTranslationVotes?.[0] ?? null,
		})),
	}));
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

export async function fetchPaginatedProjectSummaries({
	page = 1,
	pageSize = 9,
	projectOwnerId,
	isPopular = false,
	locale = "en",
	currentUserId,
	tagIds,
}: FetchProjectParams): Promise<{
	projectSummaries: ProjectSummary[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	// 共通フィルタ
	const baseWhere: Prisma.ProjectWhereInput = {};
	// 所有者のみ表示したい場合
	if (projectOwnerId) baseWhere.userId = projectOwnerId;

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
	const select = createProjectsWithRelationsSelect(true, locale, currentUserId);

	// findManyとcountを同時並列で呼び出し
	const [rawProjects, total] = await Promise.all([
		prisma.project.findMany({
			where: baseWhere,
			orderBy,
			skip,
			take: pageSize,
			select,
		}),
		prisma.project.count({
			where: baseWhere,
		}),
	]);

	// Transform each project to include segmentWithTranslations
	const projects = rawProjects.map((p) => ({
		...p,
		createdAt: p.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"project",
			p.id,
			normalizeProjectSegments(p.projectSegments),
		),
	}));

	return {
		projectSummaries: projects,
		totalPages: Math.ceil(total / pageSize),
	};
}

export async function fetchProjectDetail(
	projectId: string,
	locale: string,
	currentUserId?: string,
): Promise<ProjectDetail | null> {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: {
			...createProjectRelatedFields(false, locale, currentUserId),
		},
	});

	if (!project) return null;

	const projectWithSegments = await normalizeProjectSegments(
		project.projectSegments,
	);

	return {
		...project,
		createdAt: project.createdAt.toISOString(),
		segmentBundles: toSegmentBundles(
			"project",
			project.id,
			projectWithSegments,
		),
	};
}
