import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import {
	CATEGORIES,
	getSearchCopy,
} from "@/app/[locale]/(common-layout)/search/constants";
import SearchPage from "@/app/[locale]/(common-layout)/search/page";
import { isSupportedLocale } from "@/domain/locales";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import { searchScriptures } from "./-scripture-data";

export const Route = createFileRoute("/$locale/search")({
	validateSearch: z.object({
		query: z.string().optional(),
		category: z.enum(CATEGORIES).catch("title"),
	}),
	loaderDeps: ({ search }) => ({
		category: search.category ?? "title",
		query: search.query?.trim() ?? "",
	}),
	loader: async ({ deps, params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
		return searchScriptures({
			data: {
				category: deps.category,
				locale: params.locale,
				query: deps.query,
			},
		});
	},
	head: ({ params }) => {
		const locale = isSupportedLocale(params.locale) ? params.locale : "en";
		const copy = getSearchCopy(locale);
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale,
			path: `/${locale}/search`,
			pathForLocale: (targetLocale) => `/${targetLocale}/search`,
			title: `${copy.title} · Digital Buddhism`,
			description: copy.description,
			indexable: false,
		});
	},
	component: SearchRoutePage,
});

function SearchRoutePage() {
	const { locale } = Route.useParams();
	const search = Route.useSearch();
	const results = Route.useLoaderData();

	return (
		<CommonLayout locale={locale}>
			<SearchPage
				category={search.category ?? "title"}
				locale={locale}
				query={search.query?.trim() ?? ""}
				results={results}
			/>
		</CommonLayout>
	);
}
