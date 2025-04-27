import { prisma } from "@/lib/prisma";

export async function getProjectCommentById(projectCommentId: number) {
	return await prisma.projectComment.findUnique({
		where: { id: projectCommentId },
		select: { userId: true },
	});
}
