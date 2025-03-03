import { fetchPageWithPageSegments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { TranslateTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import {
	createPageAITranslationInfo,
	createUserAITranslationInfo,
} from "@/app/[locale]/_db/mutations.server";
import { BASE_URL } from "@/app/constants/base-url";
import type { TranslateJobParams } from "@/features/translate/types";
import { hasExistingTranslation } from "../db/queries.server";

const TARGET_LOCALES = ["en", "ja", "zh", "ko"];

export async function handlePageTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	geminiApiKey,
}: {
	currentUserId: string;
	pageId: number;
	sourceLocale: string;
	geminiApiKey: string;
}): Promise<void> {
	const targetLocales = TARGET_LOCALES.filter(
		(locale) => locale !== sourceLocale,
	);

	for (const targetLocale of targetLocales) {
		// 既存の翻訳があるかチェック
		const hasTranslation = await hasExistingTranslation(pageId, targetLocale);
		if (hasTranslation) {
			continue; // 既に翻訳がある場合はスキップ
		}

		// 翻訳情報を作成
		const userAITranslationInfo = await createUserAITranslationInfo(
			currentUserId,
			pageId,
			targetLocale,
			"gemini-1.5-flash",
		);
		const pageAITranslationInfo = await createPageAITranslationInfo(
			pageId,
			targetLocale,
		);

		// ページデータを取得
		const pageWithPageSegments = await fetchPageWithPageSegments(pageId);
		if (!pageWithPageSegments) {
			throw new Error("Page with page segments not found");
		}

		// 翻訳ジョブのパラメータを設定
		const jobParams: TranslateJobParams = {
			userAITranslationInfoId: userAITranslationInfo.id,
			pageAITranslationInfoId: pageAITranslationInfo.id,
			geminiApiKey: geminiApiKey,
			aiModel: "gemini-1.5-flash",
			userId: currentUserId,
			pageId: pageId,
			targetLocale,
			title: pageWithPageSegments.title,
			numberedElements: pageWithPageSegments.pageSegments.map((st) => ({
				number: st.number,
				text: st.text,
			})),
			translateTarget: TranslateTarget.TRANSLATE_PAGE,
		};

		// 翻訳APIを呼び出し
		await fetch(`${BASE_URL}/api/translate`, {
			method: "POST",
			body: JSON.stringify(jobParams),
		});

		// 各言語の翻訳リクエスト間に少し間隔を空ける（オプション）
		// サーバー負荷を分散させるため
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}
