import { prisma } from "~/utils/prisma";
import { isHandleTaken } from "./queries.server";

export async function updateUser(
	userId: number,
	data: {
		name: string;
		handle: string;
		profile: string | undefined;
		icon: string;
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
		return tx.user.update({
			where: {
				id: userId,
			},
			data,
		});
	});
}
