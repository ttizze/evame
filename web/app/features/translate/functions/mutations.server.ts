import type { TranslationStatus } from "@prisma/client";
import { prisma } from "~/utils/prisma";
export async function getOrCreateAIUser(name: string): Promise<number> {
	const user = await prisma.user.upsert({
		where: { handle: name },
		update: {},
		create: {
			handle: name,
			name: name,
			isAI: true,
			image: "",
			userEmail: {
				create: {
					email: `${name}@ai.com`,
				},
			},
		},
	});
	return user.id;
}

export async function updateUserAITranslationInfo(
	userAITranslationInfoId: number,
	status: TranslationStatus,
	progress: number,
) {
	return await prisma.userAITranslationInfo.update({
		where: {
			id: userAITranslationInfoId,
		},
		data: {
			aiTranslationStatus: status,
			aiTranslationProgress: progress,
			createdAt: new Date(),
		},
	});
}
