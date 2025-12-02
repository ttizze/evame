import { prisma } from "@/lib/prisma";

export async function findUserByHandle(handle: string) {
	return prisma.user.findUnique({
		where: { handle },
	});
}
