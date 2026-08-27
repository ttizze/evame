import type { ScriptureDetail } from "@/components/scripture/types";
import { PageBreadcrumb } from "./page-breadcrumb";
import { PageTree } from "./page-tree";

export function PageNavigation({
	detail,
	locale,
}: {
	detail: ScriptureDetail;
	locale: string;
}) {
	return (
		<div className="mb-4 not-prose flex items-start gap-2">
			<PageTree
				hierarchy={detail.hierarchy}
				locale={locale}
				ownerHandle={detail.ownerHandle ?? ""}
				slug={detail.slug}
				title={detail.title}
			/>
			<PageBreadcrumb hierarchy={detail.hierarchy} locale={locale} />
		</div>
	);
}
