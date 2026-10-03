import { queryPageDetail } from "./queries";

/**
 * ページ詳細を取得
 */
export async function fetchPageDetail(slug: string, locale: string) {
	const page = await queryPageDetail(slug, locale);
	if (!page) return null;

	return page;
}
