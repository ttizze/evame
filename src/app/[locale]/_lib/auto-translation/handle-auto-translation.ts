import { BASE_URL } from "@/app/_constants/base-url";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import {
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "@/app/[locale]/_db/page-detail-queries.server";
import type { TranslationJobForTranslationAPI } from "@/app/types/translation-job";
import type { TranslateJobParams } from "@/features/translate/types";
import type {
	PageCommentTranslationParams,
	PageTranslationParams,
} from "./auto-translation-strategies";

type TranslationParams = PageTranslationParams | PageCommentTranslationParams;

// 依存関係を明示的に注入するためのインターフェース
interface TranslationDependencies {
	createTranslationJob: typeof createTranslationJob;
	fetchPageWithPageSegments: typeof fetchPageWithPageSegments;
	fetchPageWithTitleAndComments: typeof fetchPageWithTitleAndComments;
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
	fetchTranslateAPI: async (url, params) => {
		return fetch(url, {
			method: "POST",
			body: JSON.stringify(params),
		});
	},
	delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export interface TranslationStrategy<T extends TranslationParams> {
	createTranslationJob(
		deps: TranslationDependencies,
		params: T,
		locale: string,
	): Promise<TranslationJobForTranslationAPI>;

	buildParamsForTranslationAPI(
		deps: TranslationDependencies,
		params: T,
		translationJob: TranslationJobForTranslationAPI,
		locale: string,
	): Promise<TranslateJobParams>;
}

import pLimit from "p-limit";

import {
	pageCommentStrategy,
	pageStrategy,
} from "./auto-translation-strategies";

type StrategyMap = {
	[K in TranslationParams["type"]]: TranslationStrategy<
		Extract<TranslationParams, { type: K }>
	>;
};

const STRATEGY_TABLE: StrategyMap = {
	page: pageStrategy,
	pageComment: pageCommentStrategy,
};

const CONCURRENCY = 3;
const limit = pLimit(CONCURRENCY);

async function handleAutoTranslation<T extends TranslationParams>(
	params: T,
	deps: TranslationDependencies,
	targetLocales: string[],
): Promise<TranslationJobForTranslationAPI[]> {
	const strategy = STRATEGY_TABLE[params.type] as TranslationStrategy<T>;

	const results = await Promise.all(
		targetLocales.map((locale) =>
			limit(async () => {
				const job = await strategy.createTranslationJob(deps, params, locale);
				const body = await strategy.buildParamsForTranslationAPI(
					deps,
					params,
					job,
					locale,
				);
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
			provider: "vertex",
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
			provider: "vertex",
		},
		deps,
		targetLocales,
	);
}
