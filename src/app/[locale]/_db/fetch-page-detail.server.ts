import { cacheLife, cacheTag } from "next/cache";
import { queryPageDetail } from "./queries";

/**
 * ページ詳細を取得
 */
export async function fetchPageDetail(slug: string, locale: string) {
	"use cache";
	cacheLife("max");

	const page = await queryPageDetail(slug, locale);
	if (!page) return null;

	cacheTag(`page:${page.id}`);
	return page;
}
