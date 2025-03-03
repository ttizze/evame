import { prisma } from "@/lib/prisma";

export async function getLatestPageSegments(pageId: number) {
	return await prisma.pageSegment.findMany({
		where: {
			pageId,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			number: true,
			text: true,
			createdAt: true,
		},
	});
}

export async function getLatestPageCommentSegments(pageCommentId: number) {
	const pageCommentSegments = await prisma.pageCommentSegment.findMany({
		where: {
			pageCommentId,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: { id: true, number: true, text: true, createdAt: true },
	});

	return pageCommentSegments;
}
