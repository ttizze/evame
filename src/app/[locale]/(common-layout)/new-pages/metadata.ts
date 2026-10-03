import { buildAlternates } from "@/app/_lib/seo-helpers";

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "新着記事 | Evame",
			description:
				"Evameの最新記事をチェック。世界中のライターが投稿した多言語コンテンツ。",
		},
		en: {
			title: "New Pages | Evame",
			description:
				"Browse the latest articles on Evame. Multilingual content from writers around the world.",
		},
		zh: {
			title: "最新文章 | Evame",
			description: "浏览Evame上的最新文章。来自世界各地作者的多语言内容。",
		},
		ko: {
			title: "새 글 | Evame",
			description:
				"Evame의 최신 기사를 확인하세요. 전 세계 작가들의 다국어 콘텐츠.",
		},
		es: {
			title: "Nuevos Artículos | Evame",
			description:
				"Explora los últimos artículos en Evame. Contenido multilingüe de escritores de todo el mundo.",
		},
	};

export function getNewPagesMetadata(locale: string) {
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;

	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/new-pages"),
	};
}
