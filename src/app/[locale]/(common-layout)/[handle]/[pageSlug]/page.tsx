import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_service/auth-server";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
	collectAnnotationTypes,
	PageContent,
} from "./_components/page-content";
import { PageViewCounter } from "./_components/page-view-counter";
import { generatePageMetadata } from "./_service/generate-page-metadata";
import { loadPageContentData } from "./_service/load-page-content-data";

function PageSkeleton() {
	return (
		<article className="w-full prose dark:prose-invert lg:prose-lg mx-auto mb-20">
			<Skeleton className="h-10 w-3/4 mb-4" />
			<Skeleton className="h-6 w-1/4 mb-8" />
			<div className="space-y-4">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-4/5" />
			</div>
		</article>
	);
}

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { pageSlug, locale } = await params;
	const pageDetail = await fetchPageDetail(pageSlug, locale);
	if (!pageDetail) return notFound();

	return generatePageMetadata(pageDetail);
}

export default function Page({
	params,
}: PageProps<"/[locale]/[handle]/[pageSlug]">) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			{params.then(async ({ pageSlug, locale }) => {
				const pageDetail = await fetchPageDetail(pageSlug, locale);
				if (!pageDetail) {
					return notFound();
				}

				// 非公開ページはオーナーのみ閲覧可能
				const isDraft = pageDetail.status !== "PUBLIC";
				if (isDraft) {
					const currentUser = await getCurrentUser();
					if (!currentUser || currentUser.handle !== pageDetail.userHandle) {
						return notFound();
					}
				}

				if (!pageDetail.segments.some((segment) => segment.number === 0)) {
					return notFound();
				}

				const {
					pageDetail: preparedPageDetail,
					pageCounts,
					pageViewCount,
					navigationData,
					childPages,
					description,
				} = await loadPageContentData(pageDetail, locale);
				const annotationTypes = collectAnnotationTypes(
					preparedPageDetail.segments,
				);

				return (
					<PageContent
						childPages={childPages}
						description={description}
						floatingControls={
							<FloatingControls
								annotationTypes={annotationTypes}
								likeButton={
									<PageLikeButtonClient
										className="w-10 h-10 rounded-full"
										initialLikeCount={pageCounts.likeCount}
										pageId={preparedPageDetail.id}
										showCount={false}
									/>
								}
								sourceLocale={preparedPageDetail.sourceLocale}
								userLocale={locale}
							/>
						}
						likeButton={
							<PageLikeButtonClient
								initialLikeCount={pageCounts.likeCount}
								pageId={preparedPageDetail.id}
								showCount
							/>
						}
						locale={locale}
						navigationData={navigationData}
						pageDetail={preparedPageDetail}
						pageViewCounter={
							<PageViewCounter
								className="text-muted-foreground"
								initialCount={pageViewCount}
								pageId={preparedPageDetail.id}
							/>
						}
					/>
				);
			})}
		</Suspense>
	);
}
