import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";
import { isHandleTaken } from "./queries.server";
export async function updateUser(
	userId: string,
	data: {
		name: string;
		handle: string;
		profile: string | undefined;
	},
) {
	return prisma.$transaction(async (tx) => {
		const currentUser = await tx.user.findUnique({
			where: { id: userId },
		});
		if (!currentUser) {
			throw new Error("User not found");
		}
		if (data.handle !== currentUser.handle) {
			if (await isHandleTaken(data.handle)) {
				throw new Error("This handle is already taken.");
			}
		}
		const updatedUser = await tx.user.update({
			where: {
				id: userId,
			},
			data,
		});
		return sanitizeUser(updatedUser);
	});
}

export async function updateUserImage(userId: string, imageUrl: string) {
	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: { image: imageUrl },
	});
	return sanitizeUser(updatedUser);
}
