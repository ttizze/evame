import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import type { JsonValue } from "@/db/types";
import { findTitleSegmentText } from "../../_db/queries";
import { computeRevision } from "../../_domain/compute-revision";
import { judgeSyncInput } from "../_domain/sync-judgment";
import { findPageForSync } from "./db/queries";
import type { PushInput, SyncPushInput } from "./schema";

/**
 * 全 input に対して判定を行い、結果を返す
 */
export async function buildJudgments(userId: string, data: SyncPushInput) {
	const dryRun = data.dry_run ?? false;
	return await Promise.all(
		data.inputs.map((input) => judgeOne(userId, input, { dryRun })),
	);
}

async function judgeOne(
	userId: string,
	input: PushInput,
	options: { dryRun: boolean },
) {
	const [existingPage, canonicalIncoming] = await Promise.all([
		findPageForSync(userId, input.slug),
		buildCanonicalIncoming(input, options),
	]);
	const currentRevision = await computeCurrentRevision(
		input.slug,
		existingPage,
	);

	const expectedState = resolveExpectedState(
		input.expected_revision,
		currentRevision,
	);
	const sameContent =
		currentRevision !== null
			? canonicalIncoming.incomingRevision === currentRevision
			: false;

	const judgment = judgeSyncInput({
		serverState: resolveServerState(existingPage),
		expectedState,
		sameContent,
	});

	return {
		slug: input.slug,
		input,
		judgment,
		canonicalIncoming,
		currentRevision: currentRevision ?? undefined,
		existingPageId: existingPage?.id,
	};
}

async function buildCanonicalIncoming(
	input: PushInput,
	options: { dryRun: boolean },
) {
	const { mdastJson, segments } = await markdownToMdastWithSegments({
		header: input.title,
		markdown: input.body,
		autoUploadImages: !options.dryRun,
	});
	const canonicalBody = mdastToMarkdown(mdastJson);
	const publishedAt = input.published_at ?? null;
	const incomingRevision = computeRevision({
		slug: input.slug,
		title: input.title,
		body: canonicalBody,
		publishedAt,
	});

	return {
		mdastJson,
		segments,
		publishedAt,
		incomingRevision,
	};
}

async function computeCurrentRevision(
	slug: string,
	existingPage: Awaited<ReturnType<typeof findPageForSync>>,
): Promise<string | null> {
	if (!existingPage || existingPage.status === "ARCHIVE") {
		return null;
	}

	const title = (await findTitleSegmentText(existingPage.id)) ?? "";
	const body = mdastToMarkdown(existingPage.mdastJson as JsonValue);
	const publishedAt = existingPage.publishedAt
		? new Date(existingPage.publishedAt)
		: null;

	return computeRevision({
		slug,
		title,
		body,
		publishedAt,
	});
}

function resolveServerState(
	existingPage: Awaited<ReturnType<typeof findPageForSync>>,
): "MISSING" | "ACTIVE" | "ARCHIVED" {
	if (!existingPage) {
		return "MISSING";
	}
	if (existingPage.status === "ARCHIVE") {
		return "ARCHIVED";
	}
	return "ACTIVE";
}

function resolveExpectedState(
	expectedRevision: string | null,
	currentRevision: string | null,
): "NONE" | "MATCH" | "MISMATCH" {
	if (expectedRevision === null) {
		return "NONE";
	}
	if (currentRevision !== null && expectedRevision === currentRevision) {
		return "MATCH";
	}
	return "MISMATCH";
}
