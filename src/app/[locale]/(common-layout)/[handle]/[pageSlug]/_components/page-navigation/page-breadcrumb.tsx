import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageBreadcrumb({
	breadcrumb,
	locale,
}: {
	breadcrumb: PageForTree[];
	locale: string;
}) {
	return (
		<Breadcrumb className="not-prose">
			<BreadcrumbList>
				{breadcrumb.map((node, index) => (
					<Fragment key={node.id}>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link
									href={
										`/${locale}/${node.userHandle}/${node.slug}` as Route
									}
								>
									<SegmentElement
										className="line-clamp-1 break-all overflow-wrap-anywhere"
										interactive={false}
										segment={{
											id: node.titleSegmentId,
											contentId: node.id,
											number: 0,
											text: node.titleText,
											translationText: node.titleTranslationText,
										}}
										tagName="span"
									/>
								</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						{index < breadcrumb.length - 1 && <BreadcrumbSeparator />}
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
