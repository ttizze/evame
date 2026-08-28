import { createFileRoute } from "@tanstack/react-router";
import { TipitakaPageList } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/tipitaka-page-list";
import { getIndexData } from "./$locale/-index-data";

export const Route = createFileRoute("/$locale/")({
	loader: ({ params }) => getIndexData({ data: { locale: params.locale } }),
	component: LocaleIndex,
});

function LocaleIndex() {
	const { locale } = Route.useParams();
	const pages = Route.useLoaderData();

	return <TipitakaPageList locale={locale} pages={pages} />;
}
