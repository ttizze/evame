import { prisma } from "@/lib/prisma";

export async function isHandleTaken(handle: string): Promise<boolean> {
	const existingUser = await prisma.user.findUnique({
		where: { handle },
	});
	return !!existingUser;
}
