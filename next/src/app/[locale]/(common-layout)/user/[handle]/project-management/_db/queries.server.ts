import { prisma } from "@/lib/prisma";

export async function fetchProjectsWithRelationsByUserId(id: string) {
	const user = await prisma.user.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!user) {
		return [];
	}

	return prisma.project.findMany({
		where: {
			userId: user.id,
		},
		orderBy: {
			updatedAt: "desc",
		},
		include: {
			user: true,
			images: true,
			links: true,
			projectTagRelations: { include: { projectTag: true } },
		},
	});
}
