import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { fetchPageWithPageSegments } from "@/app/[locale]/_db/page-queries.server";
import { fetchPageWithTitleAndComments } from "@/app/[locale]/_db/page-queries.server";
import {
	fetchProjectWithProjectSegments,
	fetchProjectWithTitleAndComments,
} from "@/app/[locale]/_db/project-queries.server";
import type { TranslationJobForToast } from "@/app/[locale]/_hooks/use-translation-jobs";
import { BASE_URL } from "@/app/_constants/base-url";
import type { TranslateJobParams } from "@/features/translate/types";
import type { TranslationJob } from "@prisma/client";
interface BaseTranslationParams {
	currentUserId: string;
	sourceLocale: string;
	geminiApiKey: string;
}

export interface PageTranslationParams extends BaseTranslationParams {
	type: "page";
	pageId: number;
}

export interface ProjectTranslationParams extends BaseTranslationParams {
	type: "project";
	projectId: number;
}

export interface PageCommentTranslationParams extends BaseTranslationParams {
	type: "pageComment";
	pageId: number;
	pageCommentId: number;
}

export interface ProjectCommentTranslationParams extends BaseTranslationParams {
	type: "projectComment";
	projectId: number;
	projectCommentId: number;
}

export type TranslationParams =
	| PageTranslationParams
	| ProjectTranslationParams
	| PageCommentTranslationParams
	| ProjectCommentTranslationParams;

// 依存関係を明示的に注入するためのインターフェース
export interface TranslationDependencies {
	createTranslationJob: typeof createTranslationJob;
	fetchPageWithPageSegments: typeof fetchPageWithPageSegments;
	fetchPageWithTitleAndComments: typeof fetchPageWithTitleAndComments;
	fetchProjectWithProjectSegments: typeof fetchProjectWithProjectSegments;
	fetchProjectWithTitleAndComments: typeof fetchProjectWithTitleAndComments;
	fetchTranslateAPI: (
		url: string,
		params: TranslateJobParams,
	) => Promise<Response>;
	delay: (ms: number) => Promise<void>;
}

// デフォルトの依存関係
const defaultDependencies: TranslationDependencies = {
	createTranslationJob,
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
	fetchProjectWithProjectSegments,
	fetchProjectWithTitleAndComments,
	fetchTranslateAPI: async (url, params) => {
		return fetch(url, {
			method: "POST",
			body: JSON.stringify(params),
		});
	},
	delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export interface TranslationStrategy<T extends TranslationParams> {
	createJob(
		deps: TranslationDependencies,
		params: T,
		locale: string,
	): Promise<TranslationJob>;

	buildJobParams(
		deps: TranslationDependencies,
		params: T,
		job: TranslationJob,
		locale: string,
	): Promise<TranslateJobParams>;
}
import pLimit from "p-limit";

import {
	pageCommentStrategy,
	pageStrategy,
	projectCommentStrategy,
	projectStrategy,
} from "./translation-strategies";

type StrategyMap = {
	[K in TranslationParams["type"]]: TranslationStrategy<
		Extract<TranslationParams, { type: K }>
	>;
};

const STRATEGY_TABLE: StrategyMap = {
	page: pageStrategy,
	pageComment: pageCommentStrategy,
	project: projectStrategy,
	projectComment: projectCommentStrategy,
};

const CONCURRENCY = 3;
const limit = pLimit(CONCURRENCY);

export async function handleAutoTranslation<T extends TranslationParams>(
	params: T,
	deps: TranslationDependencies,
): Promise<TranslationJobForToast[]> {
	const strategy = STRATEGY_TABLE[params.type] as TranslationStrategy<T>;

	const targetLocales = ["en", "ja", "zh", "ko"].filter(
		(l) => l !== params.sourceLocale,
	);

	const results = await Promise.all(
		targetLocales.map((locale) =>
			limit(async () => {
				const job = await strategy.createJob(deps, params, locale);
				const body = await strategy.buildJobParams(deps, params, job, locale);
				await deps.fetchTranslateAPI(`${BASE_URL}/api/translate`, body);
				await deps.delay(1000);
				return job;
			}),
		),
	);
	return results;
}
// ページ翻訳のためのヘルパー関数

export async function handlePageAutoTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: Omit<PageTranslationParams, "type"> & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<TranslationJobForToast[]> {
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
			geminiApiKey,
		},
		deps,
	);
}
// プロジェクト翻訳のためのヘルパー関数
export async function handleProjectAutoTranslation({
	currentUserId,
	projectId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: Omit<ProjectTranslationParams, "type"> & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<TranslationJobForToast[]> {
	const deps: TranslationDependencies = {
		...defaultDependencies,
		...dependencies,
	};

	return handleAutoTranslation(
		{
			type: "project",
			currentUserId,
			projectId,
			sourceLocale,
			geminiApiKey,
		},
		deps,
	);
}

// コメント翻訳のためのヘルパー関数
export async function handlePageCommentAutoTranslation({
	currentUserId,
	pageId,
	pageCommentId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: Omit<PageCommentTranslationParams, "type"> & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<TranslationJobForToast[]> {
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
			geminiApiKey,
		},
		deps,
	);
}

// プロジェクトコメント翻訳のためのヘルパー関数
export async function handleProjectCommentAutoTranslation({
	currentUserId,
	projectId,
	projectCommentId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: Omit<ProjectCommentTranslationParams, "type"> & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<TranslationJobForToast[]> {
	const deps: TranslationDependencies = {
		...defaultDependencies,
		...dependencies,
	};

	return handleAutoTranslation(
		{
			type: "projectComment",
			currentUserId,
			projectId,
			projectCommentId,
			sourceLocale,
			geminiApiKey,
		},
		deps,
	);
}
