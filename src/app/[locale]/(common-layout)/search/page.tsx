import type { Metadata } from "next";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type React from "react";
import { buildAlternates } from "@/app/_lib/seo-helpers";
import { fetchSearchResults } from "./_db/queries.server";
import { CATEGORIES, type Category } from "./constants";
import { SearchPageClient } from "./search.client";
import { SearchResults } from "./search-results.server";

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

export async function generateMetadata(
	props: PageProps<"/[locale]/search">,
): Promise<Metadata> {
	const { locale } = await props.params;
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

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
	category: parseAsString.withDefault("title"),
	tagPage: parseAsString.withDefault("false"),
};

const loadSearchParams = createLoader(searchParamsSchema);

export default async function SearchPage(
	props: PageProps<"/[locale]/search">,
): Promise<React.ReactNode> {
	const { locale } = await props.params;
	const { page, query, category, tagPage } = await loadSearchParams(
		props.searchParams,
	);

	// 型安全性を確保
	const validCategory: Category = CATEGORIES.includes(category as Category)
		? (category as Category)
		: "title";

	const { pageSummaries, tags, users, totalPages } = await fetchSearchResults({
		query,
		category: validCategory,
		page,
		locale,
		tagPage,
	});

	return (
		<main>
			<div className="max-w-(--breakpoint-xl) mx-auto py-6">
				<SearchPageClient />
				{query && (
					<div className="">
						<SearchResults
							currentCategory={validCategory}
							currentPage={page}
							locale={locale}
							pageSummaries={pageSummaries}
							tags={tags}
							totalPages={totalPages}
							users={users}
						/>
					</div>
				)}
			</div>
		</main>
	);
}
