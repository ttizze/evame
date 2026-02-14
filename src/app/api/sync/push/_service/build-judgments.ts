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
	const currentRevisions = await computeCurrentRevisions(
		input.slug,
		existingPage,
	);

	const expectedState = resolveExpectedState(
		input.expected_revision,
		currentRevisions,
	);
	const sameContent =
		currentRevisions.canonical !== null
			? canonicalIncoming.incomingRevision === currentRevisions.canonical
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
		currentRevision: currentRevisions.canonical ?? undefined,
		existingPageId: existingPage?.id,
	};
}

async function buildCanonicalIncoming(
	input: PushInput,
	options: { dryRun: boolean },
) {
	const title = input.title.trim();
	const { mdastJson, segments } = await markdownToMdastWithSegments({
		header: title,
		markdown: input.body,
		autoUploadImages: !options.dryRun,
	});
	const canonicalBody = mdastToMarkdown(mdastJson);
	const publishedAt = input.published_at ?? null;
	const incomingRevision = computeRevision({
		slug: input.slug,
		title,
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

async function computeCurrentRevisions(
	slug: string,
	existingPage: Awaited<ReturnType<typeof findPageForSync>>,
): Promise<{ canonical: string | null; legacy: string | null }> {
	if (!existingPage || existingPage.status === "ARCHIVE") {
		return { canonical: null, legacy: null };
	}

	const title = (await findTitleSegmentText(existingPage.id)) ?? "";
	const body = mdastToMarkdown(existingPage.mdastJson as JsonValue);
	const publishedAt = existingPage.publishedAt
		? new Date(existingPage.publishedAt)
		: null;
	const legacy = computeRevision({
		slug,
		title,
		body,
		publishedAt,
	});

	const { mdastJson } = await markdownToMdastWithSegments({
		header: title.trim(),
		markdown: body,
		autoUploadImages: false,
	});
	const canonicalBody = mdastToMarkdown(mdastJson);
	const canonical = computeRevision({
		slug,
		title: title.trim(),
		body: canonicalBody,
		publishedAt,
	});

	return { canonical, legacy };
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
	currentRevisions: { canonical: string | null; legacy: string | null },
): "NONE" | "MATCH" | "MISMATCH" {
	if (expectedRevision === null) {
		return "NONE";
	}
	if (
		currentRevisions.canonical !== null &&
		expectedRevision === currentRevisions.canonical
	) {
		return "MATCH";
	}
	if (
		currentRevisions.legacy !== null &&
		expectedRevision === currentRevisions.legacy
	) {
		return "MATCH";
	}
	return "MISMATCH";
}
