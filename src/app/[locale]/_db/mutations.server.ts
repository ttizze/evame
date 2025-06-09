import { prisma } from "@/lib/prisma";
import { TranslationStatus } from "@prisma/client";

type CreateTranslationJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	pageId: number;
};

export async function createTranslationJob(params: CreateTranslationJobParams) {
	return prisma.translationJob.create({
		data: {
			aiModel: params.aiModel,
			locale: params.locale,
			userId: params.userId,
			pageId: params.pageId,
			status: TranslationStatus.PENDING,
			progress: 0,
		},
		include: {
			page: {
				select: {
					slug: true,
					user: {
						select: {
							handle: true,
						},
					},
				},
			},
		},
	});
}
