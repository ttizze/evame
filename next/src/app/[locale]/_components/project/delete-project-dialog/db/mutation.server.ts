import { prisma } from "@/lib/prisma";
export async function deleteProject(projectId: number, userId: string) {
	return await prisma.project.delete({
		where: {
			id: projectId,
			userId,
		},
	});
}
