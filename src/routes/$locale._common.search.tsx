import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CATEGORIES } from "@/app/[locale]/(common-layout)/search/constants";
import { getSearchMetadata } from "@/app/[locale]/(common-layout)/search/metadata";
import { SearchPagePresentation } from "@/app/[locale]/(common-layout)/search/presentation";
import { getSearchData } from "./$locale/-search-data";

const searchSchema = z.object({
	category: z.enum(CATEGORIES).catch("title").default("title"),
	page: z.coerce.number().int().positive().catch(1).default(1),
	query: z.string().catch("").default(""),
	tagPage: z.enum(["true", "false"]).catch("false").default("false"),
});

export const Route = createFileRoute("/$locale/_common/search")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps, params }) =>
		getSearchData({ data: { ...deps, locale: params.locale } }),
	head: ({ params }) => {
		const { title, description, alternates } = getSearchMetadata(params.locale);
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
			],
			links: [
				{ rel: "canonical", href: alternates.canonical },
				...Object.entries(alternates.languages).map(([hrefLang, href]) => ({
					rel: "alternate",
					hrefLang,
					href,
				})),
			],
		};
	},
	component: SearchRoute,
});

function SearchRoute() {
	const { locale } = Route.useParams();
	const search = Route.useSearch();
	const data = Route.useLoaderData();
	return (
		<SearchPagePresentation
			category={search.category}
			data={data}
			locale={locale}
			page={search.page}
			query={search.query}
		/>
	);
}
