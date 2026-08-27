import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSessionUser } from "@/auth/session";
import type {
	ScriptureDetail,
	ScriptureListItem,
	TranslationCandidate,
	TranslationJob,
	VoteResult,
} from "@/components/scripture/types";
import { UnauthenticatedError } from "@/domain/errors";
import { isSupportedLocale, supportedLocales } from "@/domain/locales";
import { getDatabase } from "@/server/runtime";
import type {
	ScriptureDetail as ServerScriptureDetail,
	ScriptureListItem as ServerScriptureListItem,
} from "@/server/scriptures";
import {
	getScripture as readScripture,
	listScriptures as readScriptures,
	searchScriptures as readSearchScriptures,
} from "@/server/scriptures";
import { getTranslationJob as readTranslationJob } from "@/server/translation-jobs";
import {
	addTranslation,
	deleteTranslation as removeTranslation,
} from "@/server/translations";
import { voteTranslation as saveVote } from "@/server/votes";
import { getTranslationQueue } from "@/translation/runtime";
import { createAndEnqueueTranslationJob } from "@/translation/service";
import { DEFAULT_TRANSLATION_MODEL } from "@/translation/types";
import { parseTranslationJobRequest } from "@/translation/validation";

export { supportedLocales };

export function detectPreferredLocale(languages: readonly string[]): string {
	for (const language of languages) {
		const base = language.toLowerCase().split("-")[0];
		if (supportedLocales.some((locale) => locale.code === base)) {
			return base;
		}
	}
	return "en";
}

const localeInput = z
	.string()
	.min(2)
	.refine(isSupportedLocale, "対応していないlocaleです");

async function currentUserId(): Promise<string> {
	const user = await getSessionUser(getRequest());
	if (!user?.id) throw new UnauthenticatedError();
	return user.id;
}

async function optionalUserId(): Promise<string | null> {
	return (await getSessionUser(getRequest()))?.id ?? null;
}

export function mapTranslationCandidate(
	candidate: ServerScriptureDetail["translations"][number],
): TranslationCandidate {
	return {
		id: String(candidate.id),
		locale: candidate.locale,
		text: candidate.text,
		voteCount: candidate.point,
		votedByViewer: candidate.votedByViewer,
		createdAt: candidate.createdAt,
		userName: candidate.userName,
		userHandle: candidate.userHandle,
		userProfile: candidate.userProfile,
		userIsAi: candidate.userIsAi,
		userTotalPoints: candidate.userTotalPoints,
		ownedByViewer: candidate.ownedByViewer,
		source: candidate.source,
	};
}

export function mapScriptureListItem(
	item: ServerScriptureListItem,
): ScriptureListItem {
	return {
		id: String(item.id),
		slug: item.slug,
		title: item.title,
		ownerHandle: item.ownerHandle,
		paliTitle: item.sourceLocale === "pi" ? item.title : undefined,
		hierarchy: [...item.hierarchy],
		translationCount: item.translationCount,
		href: item.href,
	};
}

export function mapScriptureDetail(
	detail: ServerScriptureDetail,
): ScriptureDetail {
	const primarySegment = detail.segments.find(
		(segment) => segment.kind === "PRIMARY",
	);
	return {
		id: String(detail.id),
		slug: detail.slug,
		title: detail.title,
		ownerHandle: detail.ownerHandle,
		paliTitle: detail.sourceLocale === "pi" ? detail.title : undefined,
		sourceLocale: detail.sourceLocale,
		displayLocale: detail.displayLocale,
		hierarchy: [...detail.hierarchy],
		sourceText: detail.sourceText,
		primarySegmentId: primarySegment
			? String(primarySegment.id)
			: detail.segments[0]
				? String(detail.segments[0].id)
				: undefined,
		segments: detail.segments.map((segment) => ({
			id: String(segment.id),
			kind: segment.kind,
			position: segment.position,
			sourceText: segment.sourceText,
			translations: segment.translations.map(mapTranslationCandidate),
		})),
		translations: detail.translations.map(mapTranslationCandidate),
		annotationLinks: detail.annotationLinks.map((link) => ({
			mainSegmentId: String(link.mainSegmentId),
			annotationSegmentId: String(link.annotationSegmentId),
			createdAt: link.createdAt,
		})),
		availableLocales: supportedLocales.map((locale) => ({ ...locale })),
	};
}

export const listScriptures = createServerFn({ method: "GET" })
	.validator(z.object({ locale: localeInput }))
	.handler(async ({ data }) => {
		const items = await readScriptures(getDatabase(), data);
		return items.map(mapScriptureListItem);
	});

export const searchScriptures = createServerFn({ method: "GET" })
	.validator(
		z.object({
			locale: localeInput,
			query: z.string().trim().max(200),
			category: z.enum(["title", "content"]).default("title"),
		}),
	)
	.handler(async ({ data }) => {
		const items = await readSearchScriptures(getDatabase(), data);
		return items.map(mapScriptureListItem);
	});

export const getScripture = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1), locale: localeInput }))
	.handler(async ({ data }) => {
		const db = getDatabase();
		const userId = await optionalUserId();
		const detail = await readScripture(db, {
			...data,
			viewerUserId: userId,
		});
		if (!detail) return null;
		return {
			...mapScriptureDetail(detail),
			authenticated: userId !== null,
		};
	});

export const voteTranslation = createServerFn({ method: "POST" })
	.validator(
		z.object({
			translationId: z.number().int().positive(),
			isUpvote: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const result = await saveVote(getDatabase(), {
			...data,
			userId: await currentUserId(),
		});
		return {
			voted: result.isUpvote,
			voteCount: result.point,
		} satisfies VoteResult;
	});

export const createTranslation = createServerFn({ method: "POST" })
	.validator(
		z.object({
			segmentId: z.number().int().positive(),
			locale: localeInput,
			text: z.string().trim().min(1),
		}),
	)
	.handler(async ({ data }) => {
		const candidate = await addTranslation(getDatabase(), {
			...data,
			userId: await currentUserId(),
		});
		return mapTranslationCandidate(candidate);
	});

export const deleteTranslation = createServerFn({ method: "POST" })
	.validator(
		z.object({
			translationId: z.number().int().positive(),
		}),
	)
	.handler(async ({ data }) => {
		await removeTranslation(getDatabase(), {
			translationId: data.translationId,
			userId: await currentUserId(),
		});
		return { success: true } as const;
	});

export const createTranslationJob = createServerFn({ method: "POST" })
	.validator(
		z.object({
			scriptureId: z.number().int().positive(),
			locale: localeInput,
			model: z.string().min(1).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await currentUserId();
		const request = parseTranslationJobRequest(
			{
				scriptureId: data.scriptureId,
				locale: data.locale,
				model: data.model ?? DEFAULT_TRANSLATION_MODEL,
				translationContext: "",
			},
			userId,
		);
		const job = await createAndEnqueueTranslationJob(
			getDatabase(),
			getTranslationQueue(),
			request,
		);
		return { id: job.id, status: job.status } satisfies TranslationJob;
	});

export const getTranslationJob = createServerFn({ method: "GET" })
	.validator(z.object({ jobId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const job = await readTranslationJob(getDatabase(), {
			...data,
			userId: await currentUserId(),
		});
		return { id: job.id, status: job.status } satisfies TranslationJob;
	});
