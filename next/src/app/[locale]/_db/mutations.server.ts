import { prisma } from "@/lib/prisma";
import { TranslationStatus } from "@prisma/client";

type PageJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	pageId: number;
	projectId?: never;
};

type ProjectJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	projectId: number;
	pageId?: never;
};

export type CreateTranslationJobParams = PageJobParams | ProjectJobParams;

export async function createTranslationJob(params: CreateTranslationJobParams) {
	if (!("pageId" in params) && !("projectId" in params)) {
		throw new Error("pageId か projectId のどちらか 1 つは必須です");
	}

	return prisma.translationJob.create({
		data: {
			aiModel: params.aiModel,
			locale: params.locale,
			userId: params.userId,
			pageId: "pageId" in params ? params.pageId : undefined,
			projectId: "projectId" in params ? params.projectId : undefined,
			status: TranslationStatus.PENDING,
			progress: 0,
		},
	});
}
