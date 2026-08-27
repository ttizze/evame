import { createFileRoute } from "@tanstack/react-router";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import HomePage from "@/app/[locale]/(common-layout)/page";
import { getSeoCopy } from "@/seo/copy";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import { listScriptures } from "./$locale/-scripture-data";

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
		<CommonLayout locale="en">
			<HomePage items={items} locale="en" />
		</CommonLayout>
	);
}
