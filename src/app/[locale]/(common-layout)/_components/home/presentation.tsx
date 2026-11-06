import { ClientOnly, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRightIcon } from "lucide-react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import AboutSectionPresentation from "../about-section/presentation";
import type { loadAboutPage } from "../about-section/service/load-about-page";
import { FloatingControls } from "../floating-controls/floating-controls.client";
import { NewPageListPresentation } from "../page/new-page-list/presentation";
import { PopularPageListPresentation } from "../page/popular-page-list/presentation";
import { getHomeFeed } from "./data";

export function HomePresentation({
	locale,
	pageDetail,
}: {
	locale: string;
	pageDetail: Awaited<ReturnType<typeof loadAboutPage>>;
}) {
	const fetchFeed = useServerFn(getHomeFeed);
	const { data, error, isLoading, mutate } = useSWR(
		["home-feed", locale],
		([, locale]) => fetchFeed({ data: locale }),
		{ refreshInterval: 30000 },
	);
	const t = useTranslations("Home");
	return (
		<div className="flex flex-col gap-8 justify-between mb-12">
			{pageDetail ? (
				<AboutSectionPresentation
					floatingControls={null}
					locale={locale}
					pageDetail={pageDetail}
					readControls={
						<ClientOnly fallback={null}>
							<FloatingControls
								alwaysVisible={true}
								position="w-full flex justify-center"
								sourceLocale={pageDetail.sourceLocale}
								userLocale={locale}
							/>
						</ClientOnly>
					}
					stats={data?.stats ?? null}
				/>
			) : null}
			<ClientOnly fallback={null}>
				<FloatingControls sourceLocale="mixed" userLocale={locale} />
			</ClientOnly>
			{error && (
				<p role="alert">
					{t("loadError")}{" "}
					<Button onClick={() => void mutate()} variant="outline">
						{t("retry")}
					</Button>
				</p>
			)}
			<div aria-busy={isLoading} className="flex flex-col gap-8">
				<NewPageListPresentation
					currentPage={1}
					locale={locale}
					pageForLists={data?.newPages.pageForLists ?? []}
					showPagination={false}
					totalPages={data?.newPages.totalPages ?? 0}
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
					pageForLists={data?.popularPages.pageForLists ?? []}
					showPagination={false}
					totalPages={data?.popularPages.totalPages ?? 0}
				/>
			</div>
		</div>
	);
}
