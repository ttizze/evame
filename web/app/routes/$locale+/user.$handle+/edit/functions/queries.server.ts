import type { User } from "@prisma/client";
import { prisma } from "~/utils/prisma";

export async function getUserByHandle(handle: string): Promise<User | null> {
	const user = await prisma.user.findUnique({
		where: { handle },
	});
	if (!user) return null;
	return user;
}
export async function isHandleTaken(handle: string): Promise<boolean> {
	const existingUser = await prisma.user.findUnique({
		where: { handle },
	});
	return !!existingUser;
}
