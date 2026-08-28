import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getTagMetadata } from "@/app/[locale]/(common-layout)/tag/[tagName]/metadata";
import { TagPagesPresentation } from "@/app/[locale]/(common-layout)/tag/[tagName]/presentation";
import { getTagData } from "./$locale/-tag-data";

const tagSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1),
});

export const Route = createFileRoute("/$locale/_common/tag/$tagName")({
	validateSearch: (search) => tagSearchSchema.parse(search),
	loaderDeps: ({ search }) => search,
	loader: ({ deps, params }) =>
		getTagData({
			data: { ...deps, locale: params.locale, tagName: params.tagName },
		}),
	head: ({ params }) => {
		const { title, description, alternates } = getTagMetadata(
			params.locale,
			params.tagName,
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
	component: TagRoute,
});

function TagRoute() {
	const { locale, tagName } = Route.useParams();
	const { page } = Route.useSearch();
	const data = Route.useLoaderData();

	return (
		<TagPagesPresentation
			data={data}
			locale={locale}
			page={page}
			tagName={tagName}
		/>
	);
}
