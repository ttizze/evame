import { createFileRoute, notFound } from "@tanstack/react-router";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import HomePage from "@/app/[locale]/(common-layout)/page";
import { isSupportedLocale } from "@/domain/locales";
import { getSeoCopy } from "@/seo/copy";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import { listScriptures, supportedLocales } from "./-scripture-data";

export const Route = createFileRoute("/$locale/")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
		return listScriptures({ data: { locale: params.locale } });
	},
	head: ({ params }) => {
		const locale = isSupportedLocale(params.locale) ? params.locale : "en";
		const copy = getSeoCopy(locale);
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale,
			path: `/${locale}`,
			pathForLocale: (targetLocale) => `/${targetLocale}`,
			title: copy.indexTitle,
			description: copy.indexDescription,
		});
	},
	component: LocaleIndexPage,
});

function LocaleIndexPage() {
	const { locale } = Route.useParams();
	const items = Route.useLoaderData();
	const selectedLocale = supportedLocales.some((item) => item.code === locale)
		? locale
		: "en";

	return (
		<CommonLayout locale={selectedLocale}>
			<HomePage items={items} locale={selectedLocale} />
		</CommonLayout>
	);
}
