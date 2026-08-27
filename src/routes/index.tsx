import { createFileRoute } from "@tanstack/react-router";
import { ScriptureIndex } from "@/components/scripture/scripture-index";
import { listScriptures, supportedLocales } from "./$locale/-scripture-data";

export const Route = createFileRoute("/")({
	loader: () => listScriptures({ data: { locale: "en" } }),
	component: RootIndexPage,
});

function RootIndexPage() {
	const items = Route.useLoaderData();

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
			<ScriptureIndex
				availableLocales={[...supportedLocales]}
				items={items}
				locale="en"
			/>
		</main>
	);
}
