import { prisma } from "@/lib/prisma";

export async function toggleProjectLike(
	projectId: number,
	currentUserId: string,
) {
	const project = await prisma.project.findUnique({ where: { id: projectId } });
	if (!project) {
		throw new Error("Project not found");
	}

	const existing = await prisma.projectLike.findFirst({
		where: {
			projectId,
			userId: currentUserId,
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
				userId: currentUserId,
			},
		});
		await createProjectLikeNotification({
			projectId,
			targetUserId: project.userId,
			actorId: currentUserId,
		});
		liked = true;
	}

	// Get updated like count
	const likeCount = await prisma.projectLike.count({
		where: { projectId },
	});

	return { liked, likeCount };
}

export async function createProjectLikeNotification({
	projectId,
	targetUserId,
	actorId,
}: {
	projectId: number;
	targetUserId: string;
	actorId: string;
}) {
	await prisma.notification.create({
		data: {
			projectId,
			userId: targetUserId,
			actorId,
			type: "PROJECT_LIKE",
		},
	});
}
