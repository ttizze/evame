import { prisma } from "@/lib/prisma";

export async function getPageSegments(pageId: number) {
	return await prisma.pageSegment.findMany({
		where: { pageId },
		select: {
			id: true,
			number: true,
		},
	});
}

export async function getPageCommentSegments(pageCommentId: number) {
	return await prisma.pageCommentSegment.findMany({
		where: {
			pageCommentId,
		},
		select: {
			id: true,
			number: true,
		},
	});
}
