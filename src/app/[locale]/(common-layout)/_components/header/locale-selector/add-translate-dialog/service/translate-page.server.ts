import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { fetchPageIdBySlug } from "@/app/[locale]/_db/page-utility-queries.server";
import { enqueueTranslate } from "@/app/[locale]/_infrastructure/qstash/enqueue-translate.server";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import {
	fetchAnnotationContentIdsForPage,
	fetchPageCommentIds,
} from "../db/queries.server";

/* ───────── 型 ───────── */

interface TranslatePageParams {
	pageSlug: string;
	aiModel: string;
	locale: string;
	userId: string;
}

interface NewJobParams {
	userId: string;
	aiModel: string;
	locale: string;
	pageId: number;
	pageCommentId: number | null;
	annotationContentId: number | null;
	jobs: TranslationJobForToast[];
}

/* ───────── ジョブ作成・キュー投入 ───────── */

/** 翻訳ジョブを作成しキューに投入する */
async function createAndEnqueueJob(params: NewJobParams) {
	const job = await createTranslationJob({
		userId: params.userId,
		aiModel: params.aiModel,
		locale: params.locale,
		pageId: params.pageId,
	});

	params.jobs.push(job);

	await enqueueTranslate({
		translationJobId: job.id,
		aiModel: params.aiModel,
		userId: params.userId,
		targetLocale: params.locale,
		pageId: params.pageId,
		pageCommentId: params.pageCommentId,
		annotationContentId: params.annotationContentId,
	});
}

/* ───────── ページ翻訳オーケストレーション ───────── */

/**
 * ページ全体の翻訳ジョブを作成する
 * - 本文、コメント、注釈それぞれのジョブを作成しキューに投入
 */
export async function translatePage(
	params: TranslatePageParams,
): Promise<
	| { success: true; jobs: TranslationJobForToast[] }
	| { success: false; message: string }
> {
	const page = await fetchPageIdBySlug(params.pageSlug);
	if (!page) return { success: false, message: "Page not found" };
	const pageId = page.id;

	const jobs: TranslationJobForToast[] = [];

	// 本文の翻訳ジョブ
	await createAndEnqueueJob({
		userId: params.userId,
		aiModel: params.aiModel,
		locale: params.locale,
		pageId,
		pageCommentId: null,
		annotationContentId: null,
		jobs,
	});

	// ページコメントの翻訳ジョブ
	const commentIds = await fetchPageCommentIds(pageId);
	for (const commentId of commentIds) {
		await createAndEnqueueJob({
			userId: params.userId,
			aiModel: params.aiModel,
			locale: params.locale,
			pageId,
			pageCommentId: commentId,
			annotationContentId: null,
			jobs,
		});
	}

	// 別コンテンツに属する注釈の翻訳ジョブ
	// 親ページのジョブと revalidate を紐付けるため pageId はそのまま保持し、
	// 翻訳を書き込む対象コンテンツを特定するため annotationContentId を渡す
	const annotationContentIds = await fetchAnnotationContentIdsForPage(pageId);
	for (const contentId of annotationContentIds) {
		await createAndEnqueueJob({
			userId: params.userId,
			aiModel: params.aiModel,
			locale: params.locale,
			pageId,
			pageCommentId: null,
			annotationContentId: contentId,
			jobs,
		});
	}

	return { success: true, jobs };
}
