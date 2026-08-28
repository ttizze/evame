import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { getProfileMetadata } from "@/app/[locale]/(common-layout)/[handle]/metadata";
import { ProfilePagePresentation } from "@/app/[locale]/(common-layout)/[handle]/presentation";
import { getHandleData } from "./$locale/-handle-data";

const profileSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1),
	query: z.string().catch(""),
	tab: z.string().catch("home"),
	sort: z.enum(["popular", "new"]).catch("popular"),
});

export const Route = createFileRoute("/$locale/_common/$handle")({
	validateSearch: (search) => profileSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({ page: search.page, sort: search.sort }),
	loader: async ({ deps, params }) => {
		const data = await getHandleData({
			data: {
				handle: params.handle,
				locale: params.locale,
				page: deps.page,
				sort: deps.sort,
			},
		});
		if (!data) {
			throw notFound();
		}
		return data;
	},
	head: ({ loaderData, params }) => {
		if (!loaderData) {
			return {};
		}

		const { title, description, image, alternates } = getProfileMetadata(
			params.locale,
			loaderData.pageOwner,
		);
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "profile" },
				...(image ? [{ property: "og:image", content: image }] : []),
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
			],
			links: [
				{ rel: "canonical", href: alternates.canonical },
				...Object.entries(alternates.languages).map(([hrefLang, href]) => ({
					rel: "alternate",
					hrefLang,
					href,
				})),
			],
		};
	},
	component: ProfileRoute,
});

function ProfileRoute() {
	const { locale } = Route.useParams();
	const search = Route.useSearch();
	const data = Route.useLoaderData();

	return (
		<ProfilePagePresentation
			floatingControls={
				<ClientOnly fallback={null}>
					<FloatingControls sourceLocale="mixed" userLocale={locale} />
				</ClientOnly>
			}
			data={data}
			locale={locale}
			page={search.page}
			sort={search.sort}
		/>
	);
}
