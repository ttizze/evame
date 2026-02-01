import { EyeIcon, MessageCircle } from "lucide-react";
import { BASE_URL } from "@/app/_constants/base-url";
import { fetchPageCounts } from "@/app/[locale]/_db/fetch-page-detail.server";
import { fetchPageViewCount } from "@/app/[locale]/_db/page-utility-queries.server";
import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";
import { PageCommentList } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/server";
import type { PageDetail } from "@/app/[locale]/types";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { ChildPages } from "./child-pages/server";
import { PageCommentForm } from "./comment/_components/page-comment-form/client";
import { ContentWithTranslations } from "./content-with-translations";
import { PageNavigation } from "./page-navigation/server";
import { PageViewCounter } from "./page-view-counter/client";
import { PreviewBanner } from "./preview-banner";

interface PageContentProps {
	pageDetail: PageDetail;
	locale: string;
}

async function collectAnnotationTypes(segments: PageDetail["segments"]) {
	const typeMap = new Map<string, { key: string; label: string }>();
	for (const segment of segments) {
		for (const link of segment.annotations ?? []) {
			const { segmentTypeKey, segmentTypeLabel } = link.annotationSegment ?? {};
			if (segmentTypeKey && segmentTypeLabel) {
				typeMap.set(segmentTypeLabel, {
					key: segmentTypeKey,
					label: segmentTypeLabel,
				});
			}
		}
	}
	return Array.from(typeMap.values()).sort((a, b) =>
		a.label.localeCompare(b.label),
	);
}

export async function PageContent({ pageDetail, locale }: PageContentProps) {
	const [pageCounts, pageViewCount, annotationTypes, description] =
		await Promise.all([
			fetchPageCounts(pageDetail.id),
			fetchPageViewCount(pageDetail.id),
			collectAnnotationTypes(pageDetail.segments),
			mdastToText(pageDetail.mdastJson).then((text) => text.slice(0, 200)),
		]);
	const isDraft = pageDetail.status !== "PUBLIC";

	const articleUrl = `${BASE_URL}/${pageDetail.sourceLocale}/${pageDetail.userHandle}/${pageDetail.slug}`;
	const authorUrl = `${BASE_URL}/${pageDetail.sourceLocale}/${pageDetail.userHandle}`;

	return (
		<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
			{!isDraft && (
				<>
					<ArticleJsonLd
						authorName={pageDetail.userName}
						authorUrl={authorUrl}
						dateModified={new Date(pageDetail.updatedAt).toISOString()}
						datePublished={new Date(pageDetail.createdAt).toISOString()}
						description={description}
						headline={pageDetail.title}
						image={`${BASE_URL}/api/og?locale=${pageDetail.sourceLocale}&slug=${pageDetail.slug}`}
						inLanguage={pageDetail.sourceLocale}
						url={articleUrl}
					/>
					<BreadcrumbJsonLd
						items={[
							{ name: "Home", url: `${BASE_URL}/${locale}` },
							{ name: pageDetail.userName, url: authorUrl },
							{ name: pageDetail.title, url: articleUrl },
						]}
					/>
				</>
			)}
			{isDraft && <PreviewBanner />}
			<PageNavigation locale={locale} pageId={pageDetail.id} />
			<ContentWithTranslations pageDetail={pageDetail} />
			<ChildPages locale={locale} parentId={pageDetail.id} />
			<div className="flex flex-wrap items-center gap-4">
				<EyeIcon className="w-5 h-5" strokeWidth={1.5} />
				<PageViewCounter
					className="text-muted-foreground"
					initialCount={pageViewCount}
					pageId={pageDetail.id}
				/>
				<PageLikeButtonClient
					className=""
					initialLikeCount={pageCounts.likeCount}
					pageId={pageDetail.id}
					showCount
				/>
				<MessageCircle className="w-5 h-5" strokeWidth={1.5} />
				<span className="text-muted-foreground">{pageCounts.pageComments}</span>
			</div>

			<FloatingControls
				annotationTypes={annotationTypes}
				likeButton={
					<PageLikeButtonClient
						className="w-10 h-10 rounded-full"
						initialLikeCount={pageCounts.likeCount}
						pageId={pageDetail.id}
						showCount={false}
					/>
				}
				sourceLocale={pageDetail.sourceLocale}
				userLocale={locale}
			/>

			<div className="mt-8 space-y-4" id="comments">
				<h2 className="text-2xl not-prose font-bold">Comments</h2>
				<PageCommentForm pageId={pageDetail.id} userLocale={locale} />
				<PageCommentList pageId={pageDetail.id} userLocale={locale} />
			</div>
		</article>
	);
}
