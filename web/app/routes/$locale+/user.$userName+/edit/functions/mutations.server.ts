import { prisma } from "~/utils/prisma";
import { isUserNameTaken } from "./queries.server";
import { encrypt } from '~/utils/encryption.server';

export async function updateUser(
	userId: number,
	data: {
		displayName: string;
		userName: string;
		profile: string | undefined;
		icon: string;
		geminiApiKey: string | undefined;
	},
) {
	return prisma.$transaction(async (tx) => {
		const currentUser = await tx.user.findUnique({
			where: { id: userId },
		});
		if (!currentUser) {
			throw new Error("User not found");
		}
		if (data.userName !== currentUser.userName) {
			const isNameTaken = await isUserNameTaken(data.userName);
			if (isNameTaken) {
				throw new Error("This name is already taken.");
			}
		}
		const updatedData = {
			...data,
			geminiApiKey: data.geminiApiKey ? encrypt(data.geminiApiKey) : null,
		};
		return tx.user.update({
			where: {
				id: userId,
			},
			data: updatedData,
		});
	});
}
