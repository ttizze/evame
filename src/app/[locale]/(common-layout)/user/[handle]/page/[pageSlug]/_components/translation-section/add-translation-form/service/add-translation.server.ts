import { revalidatePageForLocale } from "@/app/_service/revalidate-utils";
import { addUserTranslation } from "../db/mutations.server";
import { findPageBySegmentId } from "../db/queries.server";

/**
 * ユーザー翻訳を追加し、該当ページをリバリデーションする
 * @returns 成功時は { success: true }、ページが見つからない場合は { success: false, message: "page not found" }
 */
export async function addTranslationService(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
) {
	const page = await findPageBySegmentId(segmentId);
	if (!page) {
		return {
			success: false as const,
			message: "page not found",
		};
	}

	await addUserTranslation(segmentId, text, userId, locale);
	await revalidatePageForLocale(page.id, locale);

	return {
		success: true as const,
	};
}
