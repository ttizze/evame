import { fetchPageNavigationData } from "./_db/queries.server";
import { PageBreadcrumb } from "./page-breadcrumb";
import { PageTree } from "./page-tree";

interface PageNavigationProps {
	pageId: number;
	locale: string;
}

export async function PageNavigation({ pageId, locale }: PageNavigationProps) {
	const data = await fetchPageNavigationData(pageId, locale);

	if (!data) return null;

	const { rootNode, treeNodes, breadcrumb } = data;

	return (
		<div className="mb-4 not-prose flex items-start gap-2">
			<PageTree
				currentPageId={pageId}
				rootNode={rootNode}
				treeNodes={treeNodes}
			/>
			<PageBreadcrumb breadcrumb={breadcrumb} locale={locale} />
		</div>
	);
}
