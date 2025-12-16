import { createId } from "@paralleldrive/cuid2";
import { sql } from "kysely";
import { db } from "@/db";
import type { Translationproofstatus, Translationstatus } from "@/db/types";

export async function getOrCreateAIUser(name: string): Promise<string> {
	// 既存ユーザーを確認
	const existing = await db
		.selectFrom("users")
		.selectAll()
		.where("handle", "=", name)
		.executeTakeFirst();

	if (existing) {
		return existing.id;
	}

	// 存在しない場合は作成
	const user = await db
		.insertInto("users")
		.values({
			id: createId(),
			handle: name,
			name: name,
			isAi: true,
			image: "",
			email: `${name}@ai.com`,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return user.id;
}

export async function updateTranslationJob(
	translationJobId: number,
	status: Translationstatus,
	progress: number,
	userId?: string,
	pageId?: number,
) {
	const updateData: {
		status: Translationstatus;
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
		.set({ status: "IN_PROGRESS" satisfies Translationstatus, progress: 0 })
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

export async function markJobCompleted(translationJobId: number) {
	const updated = await db
		.updateTable("translationJobs")
		.set({ status: "COMPLETED" satisfies Translationstatus, progress: 100 })
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

export async function markJobFailed(translationJobId: number, progress = 0) {
	const updated = await db
		.updateTable("translationJobs")
		.set({ status: "FAILED" satisfies Translationstatus, progress })
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

export async function ensurePageLocaleTranslationProof(
	pageId: number,
	locale: string,
) {
	await db
		.insertInto("pageLocaleTranslationProofs")
		.values({
			pageId,
			locale,
			translationProofStatus: "MACHINE_DRAFT" satisfies Translationproofstatus,
		})
		.onConflict((oc) => oc.columns(["pageId", "locale"]).doNothing())
		.execute();
}

export async function incrementTranslationProgress(
	translationJobId: number,
	inc: number,
) {
	return db.transaction().execute(async (tx) => {
		// 端末状態（COMPLETED/FAILED）や 100 到達後は増分しない
		await tx
			.updateTable("translationJobs")
			.set({
				status: "IN_PROGRESS" satisfies Translationstatus,
				progress: sql`progress + ${inc}`,
			})
			.where("id", "=", translationJobId)
			.where("status", "not in", ["COMPLETED", "FAILED"])
			.where("progress", "<", 100)
			.execute();

		// 100 以上になったら完了＆100 でクランプ（冪等）
		await tx
			.updateTable("translationJobs")
			.set({
				status: "COMPLETED" satisfies Translationstatus,
				progress: 100,
			})
			.where("id", "=", translationJobId)
			.where("progress", ">=", 100)
			.where("status", "!=", "COMPLETED")
			.execute();

		const result = await tx
			.selectFrom("translationJobs")
			.selectAll()
			.where("id", "=", translationJobId)
			.executeTakeFirst();

		return result;
	});
}
