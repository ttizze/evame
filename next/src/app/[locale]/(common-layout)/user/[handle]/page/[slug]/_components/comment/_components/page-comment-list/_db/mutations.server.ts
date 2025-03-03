import { prisma } from "@/lib/prisma";

export async function deletePageComment(pageCommentId: number) {
	return await prisma.pageComment.delete({
		where: { id: pageCommentId },
	});
}
