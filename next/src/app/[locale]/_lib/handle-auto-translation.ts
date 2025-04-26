import { fetchPageWithPageSegments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { fetchPageWithTitleAndComments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { fetchProjectWithProjectSegments } from "@/app/[locale]/_db/project-queries.server";
import { BASE_URL } from "@/app/_constants/base-url";
import type { TranslateJobParams } from "@/features/translate/types";
import type { TranslationJob } from "@prisma/client";
const TARGET_LOCALES = ["en", "ja", "zh", "ko"];

interface BaseTranslationParams {
	currentUserId: string;
	sourceLocale: string;
	geminiApiKey: string;
}

interface PageTranslationParams extends BaseTranslationParams {
	pageId: number;
}

interface ProjectTranslationParams extends BaseTranslationParams {
	projectId: string;
}

interface CommentTranslationParams extends PageTranslationParams {
	commentId: number;
}

type TranslationParams =
	| (PageTranslationParams & { type: "page" })
	| (CommentTranslationParams & { type: "comment" })
	| (ProjectTranslationParams & { type: "project" });

// 依存関係を明示的に注入するためのインターフェース
interface TranslationDependencies {
	createTranslationJob: typeof createTranslationJob;
	fetchPageWithPageSegments: typeof fetchPageWithPageSegments;
	fetchPageWithTitleAndComments: typeof fetchPageWithTitleAndComments;
	fetchProjectWithProjectSegments: typeof fetchProjectWithProjectSegments;
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
	fetchTranslateAPI: async (url, params) => {
		return fetch(url, {
			method: "POST",
			body: JSON.stringify(params),
		});
	},
	delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export async function handleAutoTranslation(
	params: TranslationParams,
	dependencies: Partial<TranslationDependencies> = {},
): Promise<void> {
	// デフォルトの依存関係とカスタム依存関係をマージ
	const deps = { ...defaultDependencies, ...dependencies };

	const { currentUserId, sourceLocale, geminiApiKey, type } = params;

	const targetLocales = TARGET_LOCALES.filter(
		(locale) => locale !== sourceLocale,
	);

	for (const targetLocale of targetLocales) {
		let translationJob: TranslationJob;
		let jobParams: TranslateJobParams;

		if (type === "page") {
			const { pageId } = params;
			// 翻訳情報を作成
			translationJob = await deps.createTranslationJob({
				userId: currentUserId,
				pageId,
				locale: targetLocale,
				aiModel: "gemini-1.5-flash",
			});

			// ページデータを取得
			const pageWithPageSegments = await deps.fetchPageWithPageSegments(pageId);
			if (!pageWithPageSegments) {
				throw new Error("Page with page segments not found");
			}

			// 翻訳ジョブのパラメータを設定
			jobParams = {
				translationJobId: translationJob.id,
				geminiApiKey: geminiApiKey,
				aiModel: "gemini-1.5-flash",
				userId: currentUserId,
				pageId: pageId,
				targetLocale,
				targetContentType: type,
				title: pageWithPageSegments.title,
				numberedElements: pageWithPageSegments.pageSegments.map((st) => ({
					number: st.number,
					text: st.text,
				})),
			};
		} else if (type === "project") {
			const { projectId } = params;
			// 翻訳情報を作成
			translationJob = await deps.createTranslationJob({
				userId: currentUserId,
				projectId,
				locale: targetLocale,
				aiModel: "gemini-1.5-flash",
			});

			// プロジェクトデータを取得
			const projectWithSegments =
				await deps.fetchProjectWithProjectSegments(projectId);
			if (!projectWithSegments) {
				throw new Error("Project with segments not found");
			}

			// 翻訳ジョブのパラメータを設定
			jobParams = {
				translationJobId: translationJob.id,
				geminiApiKey: geminiApiKey,
				aiModel: "gemini-1.5-flash",
				userId: currentUserId,
				projectId: projectId,
				targetLocale,
				targetContentType: type,
				title: projectWithSegments.title,
				numberedElements: projectWithSegments.pageSegments.map((st) => ({
					number: st.number,
					text: st.text,
				})),
			};
		} else if (type === "comment") {
			const { pageId, commentId } = params;
			// 翻訳情報を作成
			translationJob = await deps.createTranslationJob({
				userId: currentUserId,
				pageId,
				locale: targetLocale,
				aiModel: "gemini-1.5-flash",
			});

			// ページデータを取得し、特定のコメントを見つける
			const pageWithTitleAndComments =
				await deps.fetchPageWithTitleAndComments(pageId);
			if (!pageWithTitleAndComments) {
				throw new Error("Page with title and comments not found");
			}

			// 特定のコメントIDを使用して対象のコメントを見つける
			const targetComment = pageWithTitleAndComments.pageComments.find(
				(comment) => comment.id === commentId,
			);

			if (!targetComment) {
				throw new Error(`Comment with ID ${commentId} not found`);
			}

			// コメントセグメントを準備
			const segments = targetComment.pageCommentSegments.map((segment) => ({
				number: segment.number,
				text: segment.text,
			}));

			// タイトルを追加
			segments.push({
				number: 0,
				text: pageWithTitleAndComments.title,
			});

			// 翻訳ジョブのパラメータを設定
			jobParams = {
				translationJobId: translationJob.id,
				geminiApiKey: geminiApiKey,
				aiModel: "gemini-1.5-flash",
				userId: currentUserId,
				pageId: pageWithTitleAndComments.id,
				targetLocale,
				title: pageWithTitleAndComments.title,
				numberedElements: segments,
				targetContentType: type,
				commentId: commentId,
			};
		} else {
			throw new Error(`Unsupported translation type: ${type}`);
		}

		// 翻訳APIを呼び出し
		await deps.fetchTranslateAPI(`${BASE_URL}/api/translate`, jobParams);

		// 各言語の翻訳リクエスト間に少し間隔を空ける
		await deps.delay(1000);
	}
}

// ページ翻訳のためのヘルパー関数
export async function handlePageAutoTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: PageTranslationParams & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<void> {
	return handleAutoTranslation(
		{
			type: "page",
			currentUserId,
			pageId,
			sourceLocale,
			geminiApiKey,
		},
		dependencies,
	);
}

// プロジェクト翻訳のためのヘルパー関数
export async function handleProjectAutoTranslation({
	currentUserId,
	projectId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: ProjectTranslationParams & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<void> {
	return handleAutoTranslation(
		{
			type: "project",
			currentUserId,
			projectId,
			sourceLocale,
			geminiApiKey,
		},
		dependencies,
	);
}

// コメント翻訳のためのヘルパー関数
export async function handleCommentAutoTranslation({
	currentUserId,
	pageId,
	commentId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: CommentTranslationParams & {
	dependencies?: Partial<TranslationDependencies>;
}): Promise<void> {
	return handleAutoTranslation(
		{
			type: "comment",
			currentUserId,
			pageId,
			commentId,
			sourceLocale,
			geminiApiKey,
		},
		dependencies,
	);
}

// プロジェクトコメント翻訳のためのヘルパー関数
export async function handleProjectCommentAutoTranslation({
	currentUserId,
	commentId,
	projectId,
	sourceLocale,
	geminiApiKey,
	dependencies = {},
}: ProjectTranslationParams & {
	commentId: number;
	dependencies?: Partial<TranslationDependencies>;
}): Promise<void> {
	// プロジェクトコメントの翻訳は現在未実装
	// 必要になったら実装する
	console.log("Project comment translation not implemented yet", {
		currentUserId,
		commentId,
		projectId,
		sourceLocale,
	});
	return Promise.resolve();
}
