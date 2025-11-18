import { EyeIcon, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BASE_URL } from "@/app/_constants/base-url";
import {
	LinkedSegmentsProvider,
	type LinkedSegmentTypeInfo,
} from "@/app/_context/linked-segment-provider.client";
import { SourceLocaleBridge } from "@/app/_context/source-locale-bridge.client";
import { FloatingControls } from "@/app/[locale]/_components/floating-controls.client";
import { PageLikeButtonClient } from "@/app/[locale]/_components/page/page-like-button/client";
import { PageViewCounter } from "@/app/[locale]/_components/page/page-view-counter/client";
import { mdastToText } from "@/app/[locale]/_lib/mdast-to-text";
import { PageCommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/server";
import { ChildPages } from "./_components/child-pages/server";
import { PageCommentForm } from "./_components/comment/_components/page-comment-form/client";
import { ContentWithTranslations } from "./_components/content-with-translations";
import { PageBreadcrumb } from "./_components/page-breadcrumb/server";
import { buildAlternateLocales } from "./_lib/build-alternate-locales";
import { fetchPageContext } from "./_lib/fetch-page-context";

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

// Force static rendering for this route (no dynamic APIs allowed)
export const dynamic = "force-static";
// Optionally enable ISR; adjust as needed
// Revalidate once per month (30 days = 2,592,000 seconds)
export const revalidate = 2592000;

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { pageSlug, locale } = await params;
	const data = await fetchPageContext(pageSlug, locale);
	if (!data) return notFound();
	const { pageDetail, pageTranslationJobs, title } = data;

	const description = await mdastToText(pageDetail.mdastJson).then((text) =>
		text.slice(0, 200),
	);
	const ogImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${pageSlug}`;
	return {
		title,
		description,
		openGraph: {
			type: "article",
			title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		alternates: {
			languages: buildAlternateLocales(
				pageDetail,
				pageTranslationJobs,
				pageDetail.user.handle,
				locale,
			),
		},
	};
}

export default async function Page(
	props: PageProps<"/[locale]/user/[handle]/page/[pageSlug]">,
) {
	const { pageSlug, locale } = await props.params;
	const data = await fetchPageContext(pageSlug, locale);
	const { pageDetail, pageViewCount } = data;
	// Public route only renders PUBLIC pages
	if (pageDetail.status !== "PUBLIC") {
		return notFound();
	}

	const linkedSegmentTypeMap = new Map<string, LinkedSegmentTypeInfo>();
	for (const segment of pageDetail.content.segments) {
		for (const group of segment.linkedSegments ?? []) {
			const existing = linkedSegmentTypeMap.get(group.type.key);
			if (existing) {
				existing.count += group.segments.length;
			} else {
				linkedSegmentTypeMap.set(group.type.key, {
					key: group.type.key,
					label: group.type.label,
					count: group.segments.length,
				});
			}
		}
	}
	const linkedSegmentTypes = Array.from(linkedSegmentTypeMap.values());

	const article = (
		<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
			<PageBreadcrumb locale={locale} pageDetail={pageDetail} />
			<ContentWithTranslations pageData={data} />
			<ChildPages locale={locale} parentId={pageDetail.id} />
			<div className="flex items-center gap-4">
				<EyeIcon className="w-5 h-5" strokeWidth={1.5} />
				<PageViewCounter
					className="text-muted-foreground"
					initialCount={pageViewCount}
					pageId={pageDetail.id}
				/>
				<PageLikeButtonClient className="" pageId={pageDetail.id} showCount />
				<MessageCircle className="w-5 h-5" strokeWidth={1.5} />
				<span className="text-muted-foreground">
					{pageDetail._count?.pageComments || 0}
				</span>
			</div>

			<FloatingControls
				likeButton={
					<PageLikeButtonClient
						className="w-10 h-10 border rounded-full"
						pageId={pageDetail.id}
						showCount={false}
					/>
				}
			/>

			<div className="mt-8 space-y-4" id="comments">
				<h2 className="text-2xl not-prose font-bold">Comments</h2>
				<PageCommentForm pageId={pageDetail.id} userLocale={locale} />
				<PageCommentList pageId={pageDetail.id} userLocale={locale} />
			</div>
		</article>
	);

	return (
		<>
			<SourceLocaleBridge locale={pageDetail.sourceLocale} />
			{linkedSegmentTypes.length > 0 ? (
				<LinkedSegmentsProvider types={linkedSegmentTypes}>
					{article}
				</LinkedSegmentsProvider>
			) : (
				article
			)}
		</>
	);
}
