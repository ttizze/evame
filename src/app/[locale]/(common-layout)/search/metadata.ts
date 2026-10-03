import { buildAlternates } from "@/app/_lib/seo-helpers";

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "検索 | Evame",
			description:
				"Evameで記事、ユーザー、タグを検索。世界中の多言語コンテンツを見つけよう。",
		},
		en: {
			title: "Search | Evame",
			description:
				"Search articles, users, and tags on Evame. Discover multilingual content from around the world.",
		},
		zh: {
			title: "搜索 | Evame",
			description:
				"在Evame搜索文章、用户和标签。发现来自世界各地的多语言内容。",
		},
		ko: {
			title: "검색 | Evame",
			description:
				"Evame에서 기사, 사용자, 태그를 검색하세요. 전 세계의 다국어 콘텐츠를 발견하세요.",
		},
		es: {
			title: "Buscar | Evame",
			description:
				"Busca artículos, usuarios y etiquetas en Evame. Descubre contenido multilingüe de todo el mundo.",
		},
	};

export function getSearchMetadata(locale: string) {
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;
	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/search"),
	};
}
