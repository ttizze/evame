import { prisma } from "@/lib/prisma";

export async function deleteProjectComment(
	projectCommentId: number,
	userId: string,
) {
	return await prisma.projectComment.update({
		where: { id: projectCommentId, userId },
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
