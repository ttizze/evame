import { queryAboutPage } from "../_db/queries";

export async function loadAboutPage(locale: string) {
	// トップでは「原文 + 現在ロケール翻訳」の並列表示を成立させるため、
	// 表示ロケールと逆の原文ページを読む。
	// - ja: 英語原文ページ(evame) + ja翻訳
	// - ja以外: 日本語原文ページ(evame-ja) + 各ロケール翻訳
	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	const rows = await queryAboutPage(pageSlug, locale);
	if (rows.length === 0) return null;
	return {
		sourceLocale: rows[0].sourceLocale,
		segments: rows.flatMap(
			({ id, contentId, number, text, translationText }) =>
				id === null || contentId === null || number === null || text === null
					? []
					: [{ id, contentId, number, text, translationText }],
		),
	};
}
