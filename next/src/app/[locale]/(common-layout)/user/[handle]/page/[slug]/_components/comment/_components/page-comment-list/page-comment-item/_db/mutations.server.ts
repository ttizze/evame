import { prisma } from "@/lib/prisma";

export async function deletePageComment(pageCommentId: number) {
	return await prisma.pageComment.update({
		where: { id: pageCommentId },
		data: {
			contentJson: {
				type: "doc",
				contentJson: [
					{ type: "paragraph", content: [{ text: "deleted", type: "text" }] },
				],
			},
		},
	});
}
