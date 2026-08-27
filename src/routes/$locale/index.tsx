import { createFileRoute, notFound } from "@tanstack/react-router";
import { ScriptureIndex } from "@/components/scripture/scripture-index";
import { isSupportedLocale } from "@/domain/locales";
import { listScriptures, supportedLocales } from "./-scripture-data";

export const Route = createFileRoute("/$locale/")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
		return listScriptures({ data: { locale: params.locale } });
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
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
			<ScriptureIndex
				availableLocales={[...supportedLocales]}
				items={items}
				locale={selectedLocale}
			/>
		</main>
	);
}
