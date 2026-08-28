import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import { EditPageClient } from "@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_components/edit-page-client";
import { getPageEditData } from "./$locale/-page-edit-data";

export const Route = createFileRoute("/$locale/_edit/$handle/$pageSlug/edit")({
	loader: async ({ params }) => {
		const data = await getPageEditData({ data: params });
		if (!data) {
			throw notFound();
		}
		return data;
	},
	head: () => ({
		meta: [
			{ title: "Edit Page" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: PageEditRoute,
});

function PageEditRoute() {
	const { handle } = Route.useParams();
	const data = Route.useLoaderData();

	return (
		<ClientOnly fallback={null}>
			<EditPageClient handle={handle} {...data} />
		</ClientOnly>
	);
}
