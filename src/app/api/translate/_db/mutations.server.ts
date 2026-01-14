import { db } from "@/db";
import type { TranslationStatus } from "@/db/types";

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
