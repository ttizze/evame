import { ClientOnly, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HomeData } from "@/routes/$locale/-index-data";
import AboutSectionPresentation from "../about-section/presentation";
import { FloatingControls } from "../floating-controls/floating-controls.client";
import { NewPageListPresentation } from "../page/new-page-list/presentation";
import { PopularPageListPresentation } from "../page/popular-page-list/presentation";
import { TipitakaPageList } from "../tipitaka-page-list/tipitaka-page-list";

export function HomePresentation({
	locale,
	data,
}: {
	locale: string;
	data: HomeData;
}) {
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			{data.pageDetail ? (
				<AboutSectionPresentation
					floatingControls={null}
					locale={locale}
					pageDetail={data.pageDetail}
					readControls={
						<ClientOnly fallback={null}>
							<FloatingControls
								alwaysVisible={true}
								position="w-full flex justify-center"
								sourceLocale={data.pageDetail.sourceLocale}
								userLocale={locale}
							/>
						</ClientOnly>
					}
					stats={data.stats}
				/>
			) : null}
			<ClientOnly fallback={null}>
				<FloatingControls sourceLocale="mixed" userLocale={locale} />
			</ClientOnly>
			<NewPageListPresentation
				currentPage={1}
				locale={locale}
				pageForLists={data.newPages.pageForLists}
				showPagination={false}
				totalPages={data.newPages.totalPages}
			/>
			<div className="flex justify-center">
				<Button asChild className="rounded-full h-10 w-40" variant="default">
					<Link
						className="flex items-center gap-2"
						params={{ locale }}
						to="/$locale/new-pages"
					>
						More <ArrowRightIcon className="h-4 w-4" />
					</Link>
				</Button>
			</div>
			<PopularPageListPresentation
				currentPage={1}
				locale={locale}
				pageForLists={data.popularPages.pageForLists}
				showPagination={false}
				totalPages={data.popularPages.totalPages}
			/>
			<TipitakaPageList locale={locale} pages={data.tipitakaPages} />
		</div>
	);
}
