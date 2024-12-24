import { getTranslateUserQueue } from "~/features/translate/translate-user-queue";
import { createUserAITranslationInfo } from "~/routes/$locale+/user.$userName+/page+/$slug+/functions/mutations.server";
import { fetchUserByUserName } from "~/routes/functions/queries.server";
import { prisma } from "~/utils/prisma";

// 実際にはgetAllPagesByUserIdを何らかの形で用意する必要がある
// ここでは例としてprismaでpagesを取得する処理を記述
async function getAllPagesByUserId(userId: number) {
	return prisma.page.findMany({
		where: { userId },
		include: { sourceTexts: true },
	});
}

// スクリプト用メイン処理
(async () => {
	try {
		const USER_NAME = "evame";
		const LOCALE = "en";
		const AI_MODEL = "gemini-1.5-flash";
		const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
		if (!GEMINI_API_KEY) {
			console.error("GEMINI_API_KEY is not set.");
			process.exit(1);
		}

		const nonSanitizedUser = await fetchUserByUserName(USER_NAME);
		if (!nonSanitizedUser) {
			console.error(`User ${USER_NAME} not found.`);
			process.exit(1);
		}

		const pages = await getAllPagesByUserId(nonSanitizedUser.id);
		if (pages.length === 0) {
			console.log("No pages found for user:", USER_NAME);
			process.exit(0);
		}

		// 翻訳キュー
		const queue = getTranslateUserQueue(nonSanitizedUser.id);

		// 全ページに対してキュー追加
		for (const page of pages) {
			if (!page.sourceTexts || page.sourceTexts.length === 0) {
				console.log(`Skip page ${page.slug} because no sourceTexts found.`);
				continue;
			}
			const title = page.sourceTexts.filter((item) => item.number === 0)[0]
				.text;

			// UserAITranslationInfoを作成
			const userAITranslationInfo = await createUserAITranslationInfo(
				nonSanitizedUser.id,
				page.id,
				AI_MODEL,
				LOCALE,
			);

			// キューに追加
			// ジョブのデータはaction関数と同様の形でよい
			await queue.add(`translate-${nonSanitizedUser.id}-${page.slug}`, {
				userAITranslationInfoId: userAITranslationInfo.id,
				geminiApiKey: GEMINI_API_KEY,
				aiModel: AI_MODEL,
				userId: nonSanitizedUser.id,
				pageId: page.id,
				locale: LOCALE,
				title: title,
				numberedContent: page.content,
				numberedElements: page.sourceTexts,
			});

			console.log(`Added page ${page.slug} to translation queue.`);
		}

		console.log("All pages have been queued for translation.");
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
