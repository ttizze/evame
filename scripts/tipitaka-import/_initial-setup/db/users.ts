import { prisma } from "@/tests/prisma";

export async function findUserByHandle(handle: string) {
	return prisma.user.findUnique({
		where: { handle },
	});
}
