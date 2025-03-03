import { prisma } from "@/lib/prisma";
import type { TranslationStatus } from "@prisma/client";
export async function getOrCreateAIUser(name: string): Promise<string> {
	const user = await prisma.user.upsert({
		where: { handle: name },
		update: {},
		create: {
			handle: name,
			name: name,
			isAI: true,
			image: "",
			email: `${name}@ai.com`,
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
		},
	});
}

export async function updatePageAITranslationInfo(
	id: number,
	status: TranslationStatus,
) {
	return await prisma.pageAITranslationInfo.update({
		where: {
			id: id,
		},
		data: {
			aiTranslationStatus: status,
		},
	});
}
