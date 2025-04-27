import { prisma } from "@/lib/prisma";

export async function fetchProjectMetaData(slug: string) {
	return await prisma.project.findUnique({
		where: { slug },
		include: { user: true, iconImage: true },
	});
}
