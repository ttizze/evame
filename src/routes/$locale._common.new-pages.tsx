import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getNewPagesMetadata } from "@/app/[locale]/(common-layout)/new-pages/metadata";
import { NewPagesPresentation } from "@/app/[locale]/(common-layout)/new-pages/presentation";
import { getNewPagesData } from "./$locale/-new-pages-data";

const newPagesSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1),
});

export const Route = createFileRoute("/$locale/_common/new-pages")({
	validateSearch: (search) => newPagesSearchSchema.parse(search),
	loaderDeps: ({ search }) => search,
	loader: ({ deps, params }) =>
		getNewPagesData({ data: { ...deps, locale: params.locale } }),
	head: ({ params }) => {
		const { title, description, alternates } = getNewPagesMetadata(
			params.locale,
		);
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
	component: NewPagesRoute,
});

function NewPagesRoute() {
	const { locale } = Route.useParams();
	const { page } = Route.useSearch();
	const data = Route.useLoaderData();

	return <NewPagesPresentation data={data} locale={locale} page={page} />;
}
