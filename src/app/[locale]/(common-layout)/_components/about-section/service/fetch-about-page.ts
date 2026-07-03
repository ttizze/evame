import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";

export async function fetchAboutPage(locale: string) {
	return await unstable_cache(
		async () => {
			// トップでは「原文 + 現在ロケール翻訳」の並列表示を成立させるため、
			// 表示ロケールと逆の原文ページを読む。
			// - ja: 英語原文ページ(evame) + ja翻訳
			// - ja以外: 日本語原文ページ(evame-ja) + 各ロケール翻訳
			const pageSlug = locale === "ja" ? "evame" : "evame-ja";
			const pageDetail = await fetchPageDetail(pageSlug, locale);

			if (!pageDetail) {
				return notFound();
			}

			return pageDetail;
		},
		["top:about-page", locale],
		{
			revalidate: 60 * 60 * 12,
			tags: [`top:about-page:${locale}`],
		},
	)();
}
