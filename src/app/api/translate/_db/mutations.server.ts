import { TranslationProofStatus, type TranslationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
		},
	});
}

// Convenience helpers to avoid scattering raw status writes around the codebase
export async function markJobInProgress(translationJobId: number) {
	return await prisma.translationJob.update({
		where: { id: translationJobId },
		data: { status: "IN_PROGRESS", progress: 0 },
	});
}

export async function markJobCompleted(translationJobId: number) {
	return await prisma.translationJob.update({
		where: { id: translationJobId },
		data: { status: "COMPLETED", progress: 100 },
	});
}

export async function markJobFailed(translationJobId: number, progress = 0) {
	return await prisma.translationJob.update({
		where: { id: translationJobId },
		data: { status: "FAILED", progress },
	});
}

export async function ensurePageLocaleTranslationProof(
	pageId: number,
	locale: string,
) {
	await prisma.pageLocaleTranslationProof.upsert({
		where: {
			pageId_locale: {
				pageId,
				locale,
			},
		},
		update: {},
		create: {
			pageId,
			locale,
			translationProofStatus: TranslationProofStatus.MACHINE_DRAFT,
		},
	});
}

export async function incrementTranslationProgress(
	translationJobId: number,
	inc: number,
) {
	return await prisma.$transaction(async (tx) => {
		// 端末状態（COMPLETED/FAILED）や 100 到達後は増分しない
		await tx.translationJob.updateMany({
			where: {
				id: translationJobId,
				status: { notIn: ["COMPLETED", "FAILED"] },
				progress: { lt: 100 },
			},
			data: {
				status: "IN_PROGRESS",
				progress: { increment: inc },
			},
		});

		// 100 以上になったら完了＆100 でクランプ（冪等）
		await tx.translationJob.updateMany({
			where: {
				id: translationJobId,
				progress: { gte: 100 },
				status: { not: "COMPLETED" },
			},
			data: {
				status: "COMPLETED",
				progress: 100,
			},
		});

		return tx.translationJob.findUnique({
			where: { id: translationJobId },
		});
	});
}
