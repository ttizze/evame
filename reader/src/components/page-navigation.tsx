import { PageBreadcrumb } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/page-navigation/page-breadcrumb";
import { PageTree } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/page-navigation/page-tree";
import type { NavigationData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_db/queries";
import { IslandProviders } from "./providers";

export function PageNavigationIsland({
	locale,
	search,
	pageId,
	data,
}: {
	locale: string;
	search: string;
	pageId: number;
	data: NavigationData;
}) {
	return (
		<IslandProviders locale={locale} search={search}>
			<div className="mb-4 not-prose flex items-start gap-2">
				<PageTree
					currentPageId={pageId}
					locale={locale}
					rootNode={data.rootNode}
					treeNodes={data.treeNodes}
				/>
				<PageBreadcrumb breadcrumb={data.breadcrumb} locale={locale} />
			</div>
		</IslandProviders>
	);
}
