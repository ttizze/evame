import { createFileRoute, notFound } from "@tanstack/react-router";
import { ScriptureIndex } from "@/components/scripture/scripture-index";
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
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
			<ScriptureIndex
				availableLocales={[...supportedLocales]}
				items={items}
				locale={selectedLocale}
			/>
		</main>
	);
}
