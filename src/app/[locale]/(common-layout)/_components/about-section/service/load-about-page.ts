import { queryPageDetail } from "@/app/[locale]/_db/queries";

export function loadAboutPage(locale: string) {
	// トップでは「原文 + 現在ロケール翻訳」の並列表示を成立させるため、
	// 表示ロケールと逆の原文ページを読む。
	// - ja: 英語原文ページ(evame) + ja翻訳
	// - ja以外: 日本語原文ページ(evame-ja) + 各ロケール翻訳
	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	return queryPageDetail(pageSlug, locale);
}
