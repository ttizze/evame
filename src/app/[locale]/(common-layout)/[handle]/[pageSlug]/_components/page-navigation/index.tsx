import type { NavigationData } from "../../_db/queries";
import { PageBreadcrumb } from "./page-breadcrumb";
import { PageTree } from "./page-tree";

interface PageNavigationProps {
	pageId: number;
	locale: string;
	data: NavigationData | null;
}

export function PageNavigation({ pageId, locale, data }: PageNavigationProps) {
	if (!data) return null;
	const { rootNode, treeNodes, breadcrumb } = data;

	return (
		<div className="mb-4 not-prose flex items-start gap-2">
			<PageTree
				currentPageId={pageId}
				locale={locale}
				rootNode={rootNode}
				treeNodes={treeNodes}
			/>
			<PageBreadcrumb breadcrumb={breadcrumb} locale={locale} />
		</div>
	);
}
