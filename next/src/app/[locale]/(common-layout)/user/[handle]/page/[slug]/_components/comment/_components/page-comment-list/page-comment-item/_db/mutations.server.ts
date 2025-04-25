import { prisma } from "@/lib/prisma";

export async function deletePageComment(pageCommentId: number) {
	return await prisma.pageComment.update({
		where: { id: pageCommentId },
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
