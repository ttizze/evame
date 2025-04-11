import { prisma } from "@/lib/prisma";

export async function toggleProjectLike(projectId: string, userId: string) {
	const project = await prisma.project.findUnique({ where: { id: projectId } });
	if (!project) {
		throw new Error("Project not found");
	}

	const existing = await prisma.projectLike.findFirst({
		where: {
			projectId,
			userId,
		},
	});

	let liked: boolean;
	if (existing) {
		await prisma.projectLike.delete({ where: { id: existing.id } });
		liked = false;
	} else {
		await prisma.projectLike.create({
			data: {
				projectId,
				userId,
			},
		});
		liked = true;
	}

	// Get updated like count
	const likeCount = await prisma.projectLike.count({
		where: { projectId },
	});

	return { liked, likeCount };
}
