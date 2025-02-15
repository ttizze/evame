import type { SanitizedUser } from "@/app/types";
import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";

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
