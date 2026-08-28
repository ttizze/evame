import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { PageManagementTabClient } from "@/app/[locale]/(common-layout)/[handle]/page-management/_components/page-management-tab/client";
import { getPageManagementData } from "./$locale/-page-management-data";

const pageManagementSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1).default(1),
	query: z.string().catch("").default(""),
});

export const Route = createFileRoute(
	"/$locale/_common/$handle/page-management",
)({
	validateSearch: pageManagementSearchSchema,
	loaderDeps: ({ search }) => ({ page: search.page, query: search.query }),
	loader: async ({ deps, params }) => {
		const data = await getPageManagementData({
			data: {
				handle: params.handle,
				locale: params.locale,
				page: deps.page,
				query: deps.query,
			},
		});
		if (!data) {
			throw notFound();
		}
		return data;
	},
	head: () => ({ meta: [{ title: "Page Management" }] }),
	component: PageManagementRoute,
});

function PageManagementRoute() {
	const { handle, locale } = Route.useParams();
	const { page, query } = Route.useSearch();
	const data = Route.useLoaderData();
	const navigate = Route.useNavigate();

	return (
		<div className="mx-auto max-w-4xl py-10">
			<PageManagementTabClient
				currentPage={page}
				handle={handle}
				locale={locale}
				onQueryChange={(nextQuery) => {
					void navigate({
						search: (previous) => ({
							...previous,
							page: nextQuery === query ? page : 1,
							query: nextQuery,
						}),
					});
				}}
				pagesWithTitle={data.pagesWithTitle}
				pageViewCounts={data.pageViewCounts}
				query={query}
				totalPages={data.totalPages}
			/>
		</div>
	);
}
