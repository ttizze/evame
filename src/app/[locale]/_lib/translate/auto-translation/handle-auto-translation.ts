import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import {
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "@/app/[locale]/_db/page-detail-queries.server";
import type { TranslateJobParams } from "@/app/api/translate/types";
import type { TranslationJobForTranslationAPI } from "@/app/types/translation-job";
import { enqueueTranslate } from "../enqueue.server";

interface TranslationWithInfoParams {
	currentUserId: string;
	sourceLocale: string;
}

export interface PageTranslationParams extends TranslationWithInfoParams {
	type: "page";
	pageId: number;
}

export interface PageCommentTranslationParams
	extends TranslationWithInfoParams {
	type: "pageComment";
	pageId: number;
	pageCommentId: number;
}

type TranslationParams = PageTranslationParams | PageCommentTranslationParams;

// 依存関係を明示的に注入するためのインターフェース
interface TranslationDependencies {
	createTranslationJob: typeof createTranslationJob;
	fetchPageWithPageSegments: typeof fetchPageWithPageSegments;
	fetchPageWithTitleAndComments: typeof fetchPageWithTitleAndComments;
	enqueue: (params: TranslateJobParams) => Promise<unknown>;
	delay: (ms: number) => Promise<void>;
}

// デフォルトの依存関係
const defaultDependencies: TranslationDependencies = {
	createTranslationJob,
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
	enqueue: async (params) => enqueueTranslate(params),
	delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

async function buildParamsForTranslationAPI(
	deps: TranslationDependencies,
	params: TranslationParams,
	job: TranslationJobForTranslationAPI,
	locale: string,
): Promise<TranslateJobParams> {
	if (params.type === "page") {
		const page = await deps.fetchPageWithPageSegments(params.pageId);
		if (!page) throw new Error("Page not found");

		return {
			translationJobId: job.id,
			provider: "vertex",
			aiModel: job.aiModel,
			userId: params.currentUserId,
			pageId: params.pageId,
			targetLocale: locale,
			title: page.title,
			numberedElements: page.content.segments.map(({ number, text }) => ({
				number,
				text,
			})),
		};
	}

	// pageComment
	const page = await deps.fetchPageWithTitleAndComments(params.pageId);
	if (!page) throw new Error("Page not found");

	const comment = page.pageComments.find(
		(c) => c.id === (params as PageCommentTranslationParams).pageCommentId,
	);
	if (!comment) throw new Error("Comment not found");

	return {
		translationJobId: job.id,
		provider: "vertex",
		aiModel: job.aiModel,
		userId: params.currentUserId,
		pageId: params.pageId,
		targetLocale: locale,
		title: page.title,
		pageCommentId: (params as PageCommentTranslationParams).pageCommentId,
		numberedElements: [
			...comment.content.segments.map(({ number, text }) => ({
				number,
				text,
			})),
			{ number: 0, text: page.title },
		],
	};
}

async function handleAutoTranslation(
	params: TranslationParams,
	deps: TranslationDependencies,
	targetLocales: string[],
): Promise<TranslationJobForTranslationAPI[]> {
	// 並列実行で全体の待ち時間を短縮する（最小コード）。
	// QStash への publish は冪等IDを持ち、遅延を挟む必要は薄いので delay は削除。
	return Promise.all(
		targetLocales.map(async (locale) => {
			const job = await deps.createTranslationJob({
				userId: params.currentUserId,
				pageId: params.pageId,
				locale,
				aiModel: "gemini-2.0-flash",
			});

			const body = await buildParamsForTranslationAPI(
				deps,
				params,
				job,
				locale,
			);
			await deps.enqueue(body);
			return job;
		}),
	);
}
// ページ翻訳のためのヘルパー関数

export async function handlePageAutoTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	targetLocales,
	dependencies = {},
}: Omit<PageTranslationParams, "type"> & {
	targetLocales: string[];
	dependencies?: Partial<TranslationDependencies>;
}): Promise<TranslationJobForTranslationAPI[]> {
	const deps: TranslationDependencies = {
		...defaultDependencies,
		...dependencies,
	};

	return handleAutoTranslation(
		{
			type: "page",
			currentUserId,
			pageId,
			sourceLocale,
		},
		deps,
		targetLocales,
	);
}
// プロジェクト翻訳のためのヘルパー関数
// コメント翻訳のためのヘルパー関数
export async function handlePageCommentAutoTranslation({
	currentUserId,
	pageId,
	pageCommentId,
	sourceLocale,
	targetLocales,
	dependencies = {},
}: Omit<PageCommentTranslationParams, "type"> & {
	targetLocales: string[];
	dependencies?: Partial<TranslationDependencies>;
}): Promise<TranslationJobForTranslationAPI[]> {
	const deps: TranslationDependencies = {
		...defaultDependencies,
		...dependencies,
	};

	return handleAutoTranslation(
		{
			type: "pageComment",
			currentUserId,
			pageId,
			pageCommentId,
			sourceLocale,
		},
		deps,
		targetLocales,
	);
}
