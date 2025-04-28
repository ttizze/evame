import { prisma } from "@/lib/prisma";

export async function deletePageComment(pageCommentId: number, userId: string) {
	return await prisma.pageComment.update({
		where: { id: pageCommentId, userId },
		data: {
			mdastJson: {
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", value: "deleted" }],
					},
				],
			},
		},
	});
}
