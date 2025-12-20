import { db } from "@/db";
import type { TranslationStatus } from "@/db/types";

export async function updateTranslationJob(
	translationJobId: number,
	status: TranslationStatus,
	progress: number,
	userId?: string,
	pageId?: number,
) {
	const updateData: {
		status: TranslationStatus;
		progress: number;
		userId?: string;
		pageId?: number;
	} = {
		status,
		progress,
	};
	if (userId !== undefined) {
		updateData.userId = userId;
	}
	if (pageId !== undefined) {
		updateData.pageId = pageId;
	}
	const updated = await db
		.updateTable("translationJobs")
		.set(updateData)
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

// Convenience helpers to avoid scattering raw status writes around the codebase
export async function markJobInProgress(translationJobId: number) {
	const updated = await db
		.updateTable("translationJobs")
		.set({ status: "IN_PROGRESS" satisfies TranslationStatus, progress: 0 })
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

export async function markJobCompleted(translationJobId: number) {
	const updated = await db
		.updateTable("translationJobs")
		.set({ status: "COMPLETED" satisfies TranslationStatus, progress: 100 })
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}
