import { prisma } from "@/lib/prisma";

export async function fetchProjectMetaData(id: string) {
	return await prisma.project.findUnique({
		where: { id },
		include: { user: true, iconImage: true },
	});
}
