import Link from "next/link";
import { Fragment } from "react";
import { WrapSegmentClient } from "@/app/[locale]/_components/wrap-segments/client";
import type { BaseSegmentBundle, PageDetail } from "@/app/[locale]/types";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getParentChain } from "./_db/queries.server";

interface PageBreadcrumbProps {
	pageDetail: PageDetail;
	locale: string;
}

interface BreadcrumbItemData {
	href: string;
	segmentBundle: BaseSegmentBundle;
}

export async function PageBreadcrumb({
	pageDetail,
	locale,
}: PageBreadcrumbProps) {
	const breadcrumbItems: BreadcrumbItemData[] = [];

	// 親ページの階層を取得
	const parentChain = await getParentChain(pageDetail.id, locale);

	// 親ページを順番に追加
	parentChain.forEach((parent) => {
		const parentTitleSegment = parent.segmentBundles.find(
			(s: BaseSegmentBundle) => s.number === 0,
		);
		if (!parentTitleSegment) {
			return;
		}
		breadcrumbItems.push({
			href: `/${locale}/user/${parent.user.handle}/page/${parent.slug}`,
			segmentBundle: parentTitleSegment,
		});
	});

	return (
		<Breadcrumb className="mb-4 not-prose">
			<BreadcrumbList>
				{breadcrumbItems.map((item, index) => (
					<Fragment key={`${item.href}-${index}`}>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href={item.href}>
									<WrapSegmentClient
										bundle={item.segmentBundle}
										interactive={false}
										tagName="span"
										tagProps={{
											className:
												"line-clamp-1 break-all overflow-wrap-anywhere",
										}}
									>
										{item.segmentBundle.text}
									</WrapSegmentClient>
								</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						{index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
