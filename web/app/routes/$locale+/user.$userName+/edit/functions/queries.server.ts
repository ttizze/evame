import type { User } from "@prisma/client";
import { prisma } from "~/utils/prisma";

export async function getUserByUserName(
	userName: string,
): Promise<User | null> {
	const user = await prisma.user.findUnique({
		where: { userName },
	});
	if (!user) return null;
	return user;
}
export async function isUserNameTaken(userName: string): Promise<boolean> {
	const existingUser = await prisma.user.findUnique({
		where: { userName },
	});
	return !!existingUser;
}
