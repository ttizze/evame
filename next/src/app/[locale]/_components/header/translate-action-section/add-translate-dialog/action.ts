"use server";

import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { targetContentTypeValues } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import {
	fetchPageIdBySlug,
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "@/app/[locale]/_db/page-queries.server";
import {
	fetchProjectIdBySlug,
	fetchProjectWithProjectSegments,
	fetchProjectWithTitleAndComments,
} from "@/app/[locale]/_db/project-queries.server";
import { BASE_URL } from "@/app/_constants/base-url";
import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import type { TranslationJob } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/* ───────── 型 ───────── */

type Numbered = { number: number; text: string };

export type TranslateActionState = ActionResponse<
	{ translationJobs: TranslationJob[] },
	{
		pageSlug: string;
		projectSlug: string;
		aiModel: string;
		targetLocale: string;
		targetContentType: TargetContentType;
	}
>;

const schema = z.object({
	pageSlug: z.string().optional(),
	projectSlug: z.string().optional(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
	targetContentType: z.enum(targetContentTypeValues),
});

/* ───────── 共通ユーティリティ ───────── */

const toNumbered = <T extends { number: number; text: string }>(
	segments: T[],
): Numbered[] => segments.map(({ number, text }) => ({ number, text }));

async function postTranslate(body: Record<string, unknown>) {
	await fetch(`${BASE_URL}/api/translate`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

async function newJobAndSend(args: {
	userId: string;
	aiModel: string;
	locale: string;
	pageId?: number;
	projectId?: number;
	pageCommentId?: number;
	projectCommentId?: number;
	title: string;
	elements: Numbered[];
	contentType: TargetContentType;
	geminiKey: string;
	jobs: TranslationJob[];
}) {
	if (!args.pageId && !args.projectId) {
		throw new Error("pageId または projectId が必須です");
	}

	const job = await createTranslationJob({
		userId: args.userId,
		aiModel: args.aiModel,
		locale: args.locale,
		pageId: args.pageId,
		projectId: args.projectId,
	});

	args.jobs.push(job);

	await postTranslate({
		translationJobId: job.id,
		geminiApiKey: args.geminiKey,
		aiModel: args.aiModel,
		userId: args.userId,
		targetLocale: args.locale,
		title: args.title,
		numberedElements: args.elements,
		targetContentType: args.contentType,
		pageId: args.pageId,
		projectId: args.projectId,
		pageCommentId: args.pageCommentId,
		projectCommentId: args.projectCommentId,
	});
}

/* ───────── ページ処理 ───────── */

async function handlePage(opts: {
	pageSlug: string;
	aiModel: string;
	locale: string;
	userId: string;
	geminiKey: string;
	contentType: TargetContentType;
	jobs: TranslationJob[];
}) {
	const id = (await fetchPageIdBySlug(opts.pageSlug))?.id;
	if (!id) return { success: false, message: "Page not found" };

	const body = await fetchPageWithPageSegments(id);
	if (body) {
		await newJobAndSend({
			userId: opts.userId,
			aiModel: opts.aiModel,
			locale: opts.locale,
			pageId: id,
			title: body.title,
			elements: toNumbered(body.pageSegments),
			contentType: opts.contentType,
			geminiKey: opts.geminiKey,
			jobs: opts.jobs,
		});
	}

	const comments = await fetchPageWithTitleAndComments(id);
	if (comments) {
		for (const c of comments.pageComments) {
			const elems = [
				...toNumbered(c.pageCommentSegments),
				{ number: 0, text: comments.title },
			];

			await newJobAndSend({
				userId: opts.userId,
				aiModel: opts.aiModel,
				locale: opts.locale,
				pageId: id,
				pageCommentId: c.id,
				title: comments.title,
				elements: elems,
				contentType: "pageComment",
				geminiKey: opts.geminiKey,
				jobs: opts.jobs,
			});
		}
	}
}

/* ───────── プロジェクト処理 ───────── */

async function handleProject(opts: {
	projectSlug: string;
	aiModel: string;
	locale: string;
	userId: string;
	geminiKey: string;
	contentType: TargetContentType;
	jobs: TranslationJob[];
}) {
	const id = (await fetchProjectIdBySlug(opts.projectSlug))?.id;
	if (!id) return { success: false, message: "Project not found" };

	const body = await fetchProjectWithProjectSegments(id);
	if (body) {
		await newJobAndSend({
			userId: opts.userId,
			aiModel: opts.aiModel,
			locale: opts.locale,
			projectId: id,
			title: body.title,
			elements: toNumbered(body.projectSegments),
			contentType: opts.contentType,
			geminiKey: opts.geminiKey,
			jobs: opts.jobs,
		});
	}

	const com = await fetchProjectWithTitleAndComments(id);
	if (com) {
		for (const c of com.projectComments) {
			const elems = [
				...toNumbered(c.projectCommentSegments),
				{ number: 0, text: com.title },
			];

			await newJobAndSend({
				userId: opts.userId,
				aiModel: opts.aiModel,
				locale: opts.locale,
				projectId: id,
				title: com.title,
				elements: elems,
				contentType: "projectComment",
				geminiKey: opts.geminiKey,
				jobs: opts.jobs,
			});
		}
	}
}

/* ───────── Action ───────── */

export async function translateAction(
	_prev: TranslateActionState,
	formData: FormData,
): Promise<TranslateActionState> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) return { success: false, zodErrors: v.zodErrors };

	const { currentUser, data } = v;
	const gemini = await fetchGeminiApiKeyByHandle(currentUser.handle);
	if (!gemini) return { success: false, message: "Gemini API key not found" };

	const jobs: TranslationJob[] = [];

	if (data.pageSlug) {
		const pageResult = await handlePage({
			pageSlug: data.pageSlug,
			aiModel: data.aiModel,
			locale: data.targetLocale,
			userId: currentUser.id,
			geminiKey: gemini.apiKey,
			contentType: data.targetContentType,
			jobs,
		});
		if (pageResult && !pageResult.success) {
			return { success: false, message: pageResult.message };
		}
		revalidatePath(`/user/${currentUser.handle}/page/${data.pageSlug}`);
	}

	if (data.projectSlug) {
		const projectResult = await handleProject({
			projectSlug: data.projectSlug,
			aiModel: data.aiModel,
			locale: data.targetLocale,
			userId: currentUser.id,
			geminiKey: gemini.apiKey,
			contentType: data.targetContentType,
			jobs,
		});
		if (projectResult && !projectResult.success) {
			return { success: false, message: projectResult.message };
		}
		revalidatePath(`/user/${currentUser.handle}/project/${data.projectSlug}`);
	}

	return { success: true, data: { translationJobs: jobs } };
}
