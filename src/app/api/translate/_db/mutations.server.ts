import { and, eq, sql } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	pageLocaleTranslationProofs,
	translationJobs,
	users,
} from "@/drizzle/schema";
import type {
	TranslationProofStatus,
	TranslationStatus,
} from "@/drizzle/types";

export async function getOrCreateAIUser(name: string): Promise<string> {
	// 既存ユーザーを確認
	const [existing] = await db
		.select()
		.from(users)
		.where(eq(users.handle, name))
		.limit(1);

	if (existing) {
		return existing.id;
	}

	// 存在しない場合は作成
	const [user] = await db
		.insert(users)
		.values({
			handle: name,
			name: name,
			isAI: true,
			image: "",
			email: `${name}@ai.com`,
		})
		.returning();

	if (!user) {
		throw new Error(`Failed to create AI user: ${name}`);
	}

	return user.id;
}

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
	const [updated] = await db
		.update(translationJobs)
		.set(updateData)
		.where(eq(translationJobs.id, translationJobId))
		.returning();
	return updated;
}

// Convenience helpers to avoid scattering raw status writes around the codebase
export async function markJobInProgress(translationJobId: number) {
	const [updated] = await db
		.update(translationJobs)
		.set({ status: "IN_PROGRESS" satisfies TranslationStatus, progress: 0 })
		.where(eq(translationJobs.id, translationJobId))
		.returning();
	return updated;
}

export async function markJobCompleted(translationJobId: number) {
	const [updated] = await db
		.update(translationJobs)
		.set({ status: "COMPLETED" satisfies TranslationStatus, progress: 100 })
		.where(eq(translationJobs.id, translationJobId))
		.returning();
	return updated;
}

export async function markJobFailed(translationJobId: number, progress = 0) {
	const [updated] = await db
		.update(translationJobs)
		.set({ status: "FAILED" satisfies TranslationStatus, progress })
		.where(eq(translationJobs.id, translationJobId))
		.returning();
	return updated;
}

export async function ensurePageLocaleTranslationProof(
	pageId: number,
	locale: string,
) {
	await db
		.insert(pageLocaleTranslationProofs)
		.values({
			pageId,
			locale,
			translationProofStatus: "MACHINE_DRAFT" satisfies TranslationProofStatus,
		})
		.onConflictDoNothing({
			target: [
				pageLocaleTranslationProofs.pageId,
				pageLocaleTranslationProofs.locale,
			],
		});
}

export async function incrementTranslationProgress(
	translationJobId: number,
	inc: number,
) {
	return db.transaction(async (tx) => {
		// 端末状態（COMPLETED/FAILED）や 100 到達後は増分しない
		await tx
			.update(translationJobs)
			.set({
				status: "IN_PROGRESS" satisfies TranslationStatus,
				progress: sql`${translationJobs.progress} + ${inc}`,
			})
			.where(
				and(
					eq(translationJobs.id, translationJobId),
					sql`${translationJobs.status} NOT IN ('COMPLETED', 'FAILED')`,
					sql`${translationJobs.progress} < 100`,
				),
			);

		// 100 以上になったら完了＆100 でクランプ（冪等）
		await tx
			.update(translationJobs)
			.set({
				status: "COMPLETED" satisfies TranslationStatus,
				progress: 100,
			})
			.where(
				and(
					eq(translationJobs.id, translationJobId),
					sql`${translationJobs.progress} >= 100`,
					sql`${translationJobs.status} != 'COMPLETED'`,
				),
			);

		const [result] = await tx
			.select()
			.from(translationJobs)
			.where(eq(translationJobs.id, translationJobId))
			.limit(1);

		return result;
	});
}
