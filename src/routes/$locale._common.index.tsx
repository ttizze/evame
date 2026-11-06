import { createFileRoute } from "@tanstack/react-router";
import { getHomeMetadata } from "@/app/[locale]/(common-layout)/_components/home/metadata";
import { HomePresentation } from "@/app/[locale]/(common-layout)/_components/home/presentation";
import { getIndexData } from "./$locale/-index-data";

export const Route = createFileRoute("/$locale/_common/")({
	loader: ({ params }) => getIndexData({ data: { locale: params.locale } }),
	head: ({ params }) => {
		const { title, description, alternates } = getHomeMetadata(params.locale);

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
	component: LocaleIndex,
});

function LocaleIndex() {
	const { locale } = Route.useParams();
	const pageDetail = Route.useLoaderData();

	return <HomePresentation locale={locale} pageDetail={pageDetail} />;
}
