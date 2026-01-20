import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_service/auth-server";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent } from "./_components/page-content";
import { generatePageMetadata } from "./_service/generate-page-metadata";

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
}: PageProps<"/[locale]/user/[handle]/page/[pageSlug]">) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			{params.then(async ({ pageSlug, locale, handle }) => {
				const pageDetail = await fetchPageDetail(pageSlug, locale);
				if (!pageDetail) {
					return notFound();
				}

				// 非公開ページはオーナーのみ閲覧可能
				const isDraft = pageDetail.status !== "PUBLIC";
				if (isDraft) {
					const currentUser = await getCurrentUser();
					if (!currentUser || currentUser.handle !== handle) {
						return notFound();
					}
				}

				return <PageContent locale={locale} pageDetail={pageDetail} />;
			})}
		</Suspense>
	);
}
