import { prisma } from "@/lib/prisma";
export async function deleteProject(projectId: string, userId: string) {
	return await prisma.project.delete({
		where: {
			id: projectId,
			userId,
		},
	});
}
