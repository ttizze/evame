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

export async function updateTranslationJob(
	translationJobId: number,
	status: TranslationStatus,
	progress: number,
	userId?: string,
	pageId?: number,
	projectId?: string,
) {
	return await prisma.translationJob.update({
		where: {
			id: translationJobId,
		},
		data: {
			status,
			progress,
			userId,
			pageId,
			projectId,
		},
	});
}
