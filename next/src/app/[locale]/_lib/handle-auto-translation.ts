import { fetchPageWithPageSegments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { fetchPageWithTitleAndComments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { createUserAITranslationInfo } from "@/app/[locale]/_db/mutations.server";
import { createPageAITranslationInfo } from "@/app/[locale]/_db/mutations.server";
import { BASE_URL } from "@/app/_constants/base-url";
import type { TranslateJobParams } from "@/features/translate/types";

const TARGET_LOCALES = ["en", "ja", "zh", "ko"];

interface BaseTranslationParams {
	currentUserId: string;
	pageId: number;
	sourceLocale: string;
	geminiApiKey: string;
}

interface PageTranslationParams extends BaseTranslationParams {}

interface CommentTranslationParams extends BaseTranslationParams {
	commentId: number;
	content: string;
}

type TranslationParams =
	| (PageTranslationParams & { type: "page" })
	| (CommentTranslationParams & { type: "comment" });

// 依存関係を明示的に注入するためのインターフェース
interface TranslationDependencies {
	createUserAITranslationInfo: typeof createUserAITranslationInfo;
	createPageAITranslationInfo: typeof createPageAITranslationInfo;
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
	createUserAITranslationInfo,
	createPageAITranslationInfo,
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

export async function handleAutoTranslation(
	params: TranslationParams,
	dependencies: Partial<TranslationDependencies> = {},
): Promise<void> {
	// デフォルトの依存関係とカスタム依存関係をマージ
	const deps = { ...defaultDependencies, ...dependencies };

	const { currentUserId, pageId, sourceLocale, geminiApiKey, type } = params;

	const targetLocales = TARGET_LOCALES.filter(
		(locale) => locale !== sourceLocale,
	);

	for (const targetLocale of targetLocales) {
		// 翻訳情報を作成
		const userAITranslationInfo = await deps.createUserAITranslationInfo(
			currentUserId,
			pageId,
			targetLocale,
			"gemini-1.5-flash",
		);
		const pageAITranslationInfo = await deps.createPageAITranslationInfo(
			pageId,
			targetLocale,
		);

		let jobParams: TranslateJobParams;

		if (type === "page") {
			// ページデータを取得
			const pageWithPageSegments = await deps.fetchPageWithPageSegments(pageId);
			if (!pageWithPageSegments) {
				throw new Error("Page with page segments not found");
			}

			// 翻訳ジョブのパラメータを設定
			jobParams = {
				userAITranslationInfoId: userAITranslationInfo.id,
				pageAITranslationInfoId: pageAITranslationInfo.id,
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
		} else {
			// コメント翻訳の場合
			const pageWithTitleAndComments =
				await deps.fetchPageWithTitleAndComments(pageId);
			if (!pageWithTitleAndComments) {
				throw new Error("Page with title and comments not found");
			}

			// 特定のコメントIDを使用して対象のコメントを見つける
			const commentId = (params as CommentTranslationParams).commentId;
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
				userAITranslationInfoId: userAITranslationInfo.id,
				pageAITranslationInfoId: pageAITranslationInfo.id,
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

// コメント翻訳のためのヘルパー関数
export async function handleCommentAutoTranslation({
	currentUserId,
	pageId,
	commentId,
	content,
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
			content,
			sourceLocale,
			geminiApiKey,
		},
		dependencies,
	);
}
