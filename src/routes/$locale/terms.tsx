import { createFileRoute, notFound } from "@tanstack/react-router";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import TermsPage from "@/app/[locale]/terms/page";
import { isSupportedLocale } from "@/domain/locales";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";

export const Route = createFileRoute("/$locale/terms")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
	},
	head: ({ params }) => {
		const locale = isSupportedLocale(params.locale) ? params.locale : "en";
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale,
			path: `/${locale}/terms`,
			pathForLocale: (targetLocale) => `/${targetLocale}/terms`,
			title: "Terms of Service · Digital Buddhism",
			description:
				"Review the terms governing use of Digital Buddhism and its translation platform.",
		});
	},
	component: TermsRoutePage,
});

function TermsRoutePage() {
	const { locale } = Route.useParams();
	return (
		<CommonLayout locale={locale}>
			<TermsPage locale={locale} />
		</CommonLayout>
	);
}
