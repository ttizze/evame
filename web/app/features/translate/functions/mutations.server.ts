import { prisma } from "~/utils/prisma";

export async function getOrCreateAIUser(name: string): Promise<number> {
	const user = await prisma.user.upsert({
		where: { userName: name },
		update: {},
		create: {
			userName: name,
			displayName: name,
			isAI: true,
			icon: "",
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
	status: string,
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

export async function getLatestSourceTexts(pageId: number) {
	return await prisma.sourceText.findMany({
		where: {
			pageId,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			number: true,
			text: true,
			createdAt: true,
		},
	});
}
