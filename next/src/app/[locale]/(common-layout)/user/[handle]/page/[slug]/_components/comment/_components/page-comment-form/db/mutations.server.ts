import { prisma } from "@/lib/prisma";

export async function createPageComment(
	content: string,
	locale: string,
	userId: string,
	pageId: number,
	parentId?: number,
) {
	return await prisma.pageComment.create({
		data: {
			content,
			locale,
			pageId,
			userId,
			parentId,
		},
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
		},
	});
}
