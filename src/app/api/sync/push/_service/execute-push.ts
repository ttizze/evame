import type { PageStatus } from "@/db/types";
import type { buildJudgments } from "./build-judgments";
import { upsertPageForSync } from "./db/mutations";

/**
 * 判定結果に基づいてDB適用を行い、結果を返す
 *
 * 競合が1件でもある場合は全体を中断して conflict を返す。
 */
export async function executePush(
	userId: string,
	judgments: Awaited<ReturnType<typeof buildJudgments>>,
	options?: { dryRun?: boolean },
): Promise<{
	status: "applied" | "no_change" | "conflict";
	results: Array<{
		slug: string;
		action: "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";
		detail?: "UPSERT";
		applied_revision?: string;
		reason?: string;
		server_revision?: string;
	}>;
	createdCount: number;
}> {
	const conflictResults = judgments
		.filter((entry) => entry.judgment.action === "CONFLICT")
		.map((entry) => ({
			slug: entry.slug,
			action: "CONFLICT" as const,
			reason: entry.judgment.reason,
			server_revision: entry.currentRevision,
		}));

	if (conflictResults.length > 0) {
		return {
			status: "conflict",
			results: conflictResults,
			createdCount: 0,
		};
	}

	const results: Array<{
		slug: string;
		action: "AUTO_APPLY" | "NO_CHANGE" | "CONFLICT";
		detail?: "UPSERT";
		applied_revision?: string;
		reason?: string;
		server_revision?: string;
	}> = [];
	let applyCount = 0;
	let createdCount = 0;
	const dryRun = options?.dryRun ?? false;

	for (const entry of judgments) {
		if (entry.judgment.action === "NO_CHANGE") {
			results.push({ slug: entry.slug, action: "NO_CHANGE" });
			continue;
		}

		if (dryRun) {
			results.push({
				slug: entry.slug,
				action: "AUTO_APPLY",
				detail: "UPSERT",
			});
			applyCount += 1;
			continue;
		}

		const applied = await applyUpsert(userId, entry);
		if (applied.created) {
			createdCount += 1;
		}
		results.push({
			slug: entry.slug,
			action: "AUTO_APPLY",
			detail: "UPSERT",
			applied_revision: applied.appliedRevision,
		});
		applyCount += 1;
	}

	const status = applyCount > 0 ? "applied" : "no_change";
	return {
		status,
		results,
		createdCount,
	};
}

async function applyUpsert(
	userId: string,
	entry: Awaited<ReturnType<typeof buildJudgments>>[number],
): Promise<{ appliedRevision: string; created: boolean }> {
	const publishedAt = entry.canonicalIncoming.publishedAt;
	const status = resolvePageStatus(publishedAt);

	const result = await upsertPageForSync({
		userId,
		slug: entry.input.slug,
		existingPageId: entry.existingPageId,
		mdastJson: entry.canonicalIncoming.mdastJson,
		segments: entry.canonicalIncoming.segments,
		publishedAt,
		status,
	});
	return {
		appliedRevision: entry.canonicalIncoming.incomingRevision,
		created: result.created,
	};
}

function resolvePageStatus(publishedAt: Date | null): PageStatus {
	if (publishedAt && publishedAt <= new Date()) {
		return "PUBLIC";
	}
	return "DRAFT";
}
