import type { SanitizedUser } from "~/types";
import { prisma } from "~/utils/prisma";
import { sanitizeUser } from "~/utils/sanitizeUser";

export async function getUserByHandle(
	handle: string,
): Promise<SanitizedUser | null> {
	const user = await prisma.user.findUnique({
		where: { handle },
	});
	if (!user) return null;
	return sanitizeUser(user);
}
export async function isHandleTaken(handle: string): Promise<boolean> {
	const existingUser = await prisma.user.findUnique({
		where: { handle },
	});
	return !!existingUser;
}
