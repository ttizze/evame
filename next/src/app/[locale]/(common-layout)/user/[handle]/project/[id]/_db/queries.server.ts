import { prisma } from "@/lib/prisma";

export async function fetchProjectWithRelations(id: string) {
	return await prisma.project.findUnique({
		where: { id },
		include: {
			user: true,
			images: true,
			links: true,
			projectTagRelations: { include: { projectTag: true } },
		},
	});
}

export type ProjectWithRelations = Awaited<
	ReturnType<typeof fetchProjectWithRelations>
>;
