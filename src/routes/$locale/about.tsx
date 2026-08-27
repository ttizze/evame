import { createFileRoute, notFound } from "@tanstack/react-router";
import AboutPage from "@/app/[locale]/(common-layout)/about/page";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import { isSupportedLocale } from "@/domain/locales";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";

export const Route = createFileRoute("/$locale/about")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
	},
	head: ({ params }) => {
		const locale = isSupportedLocale(params.locale) ? params.locale : "en";
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale,
			path: `/${locale}/about`,
			pathForLocale: (targetLocale) => `/${targetLocale}/about`,
			title: "About · Digital Buddhism",
			description:
				"Learn how Digital Buddhism helps readers compare and refine Buddhist scripture translations.",
		});
	},
	component: AboutRoutePage,
});

function AboutRoutePage() {
	const { locale } = Route.useParams();
	return (
		<CommonLayout locale={locale}>
			<AboutPage locale={locale} />
		</CommonLayout>
	);
}
