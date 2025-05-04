import { prisma } from "@/lib/prisma";

export async function getPageCommentById(pageCommentId: number) {
	return await prisma.pageComment.findUnique({
		where: { id: pageCommentId },
		select: { userId: true },
	});
}
