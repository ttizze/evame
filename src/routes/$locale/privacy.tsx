import { createFileRoute, notFound } from "@tanstack/react-router";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import PrivacyPolicyPage from "@/app/[locale]/privacy/page";
import { isSupportedLocale } from "@/domain/locales";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";

export const Route = createFileRoute("/$locale/privacy")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
	},
	head: ({ params }) => {
		const locale = isSupportedLocale(params.locale) ? params.locale : "en";
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale,
			path: `/${locale}/privacy`,
			pathForLocale: (targetLocale) => `/${targetLocale}/privacy`,
			title: "Privacy Policy · Digital Buddhism",
			description:
				"Learn how Digital Buddhism collects, uses, and protects personal data.",
		});
	},
	component: PrivacyRoutePage,
});

function PrivacyRoutePage() {
	const { locale } = Route.useParams();
	return (
		<CommonLayout locale={locale}>
			<PrivacyPolicyPage locale={locale} />
		</CommonLayout>
	);
}
