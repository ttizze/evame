import { createFileRoute } from "@tanstack/react-router";
import { ScriptureIndex } from "@/components/scripture/scripture-index";
import { getSeoCopy } from "@/seo/copy";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import { listScriptures, supportedLocales } from "./$locale/-scripture-data";

export const Route = createFileRoute("/")({
	loader: () => listScriptures({ data: { locale: "en" } }),
	head: () => {
		const copy = getSeoCopy("en");
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale: "en",
			path: "/en",
			pathForLocale: (locale) => `/${locale}`,
			title: copy.indexTitle,
			description: copy.indexDescription,
		});
	},
	component: RootIndexPage,
});

function RootIndexPage() {
	const items = Route.useLoaderData();

	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
			<ScriptureIndex
				availableLocales={[...supportedLocales]}
				items={items}
				locale="en"
			/>
		</main>
	);
}
