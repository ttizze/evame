import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import AboutSectionPresentation from "@/app/[locale]/(common-layout)/_components/about-section/presentation";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { getAboutMetadata } from "@/app/[locale]/(common-layout)/about/metadata";
import { getAboutData } from "./$locale/-about-data";

export const Route = createFileRoute("/$locale/_common/about")({
	loader: async ({ params }) => {
		const data = await getAboutData({ data: { locale: params.locale } });
		if (!data.pageDetail) {
			throw notFound();
		}
		return { pageDetail: data.pageDetail, stats: data.stats };
	},
	head: ({ params }) => {
		const { title, description, alternates } = getAboutMetadata(params.locale);

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
	component: AboutRoutePage,
});

function AboutRoutePage() {
	const { locale } = Route.useParams();
	const { pageDetail, stats } = Route.useLoaderData();

	return (
		<AboutSectionPresentation
			floatingControls={
				<ClientOnly fallback={null}>
					<FloatingControls sourceLocale="mixed" userLocale={locale} />
				</ClientOnly>
			}
			locale={locale}
			pageDetail={pageDetail}
			readControls={
				<ClientOnly fallback={null}>
					<FloatingControls
						alwaysVisible={true}
						position="w-full flex justify-center"
						sourceLocale={pageDetail.sourceLocale}
						userLocale={locale}
					/>
				</ClientOnly>
			}
			stats={stats}
		/>
	);
}
