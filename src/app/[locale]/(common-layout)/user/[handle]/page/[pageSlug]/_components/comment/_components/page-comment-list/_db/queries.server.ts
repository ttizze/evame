import { selectSegmentFields } from "@/app/[locale]/_db/queries.server";
import { pickBestTranslation } from "@/app/[locale]/_lib/pick-best-translation";
import { prisma } from "@/lib/prisma";
export async function fetchPageCommentsWithSegments(
	pageId: number,
	locale: string,
) {
	const comments = await prisma.pageComment.findMany({
		where: { pageId },
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
			content: {
				select: {
					segments: {
						select: selectSegmentFields(locale),
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});
	return comments.map((comment) => ({
		...comment,
		content: {
			segments: pickBestTranslation(comment.content.segments),
		},
	}));
}

export type PageCommentWithSegments = NonNullable<
	Awaited<ReturnType<typeof fetchPageCommentsWithSegments>>[number]
> & {
	replies?: PageCommentWithSegments[];
};

// ────────────────────────────────────────────────────────────────────────────────
// Root-only and child-only queries for lazy loading
// ────────────────────────────────────────────────────────────────────────────────

/**
 * トップレベル（親なし）コメント一覧を取得
 */
export async function listRootPageComments(
	pageId: number,
	locale: string,
	take = 20,
	skip = 0,
) {
	const comments = await prisma.pageComment.findMany({
		where: { pageId, parentId: null },
		include: {
			user: {
				select: { handle: true, name: true, image: true },
			},
			content: {
				select: {
					segments: {
						select: selectSegmentFields(locale),
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
		take,
		skip,
	});

	return comments.map((comment) => ({
		...comment,
		content: {
			segments: pickBestTranslation(comment.content.segments),
		},
	}));
}

/**
 * 特定のコメント直下の返信一覧を取得
 */
export async function listChildPageComments(
	parentId: number,
	locale: string,
	take = 20,
	skip = 0,
) {
	const comments = await prisma.pageComment.findMany({
		where: { parentId },
		include: {
			user: {
				select: { handle: true, name: true, image: true },
			},
			content: {
				select: {
					segments: {
						select: selectSegmentFields(locale),
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
		take,
		skip,
	});

	return comments.map((comment) => ({
		...comment,
		content: {
			segments: pickBestTranslation(comment.content.segments),
		},
	}));
}
