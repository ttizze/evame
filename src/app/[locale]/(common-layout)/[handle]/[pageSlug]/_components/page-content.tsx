import { EyeIcon, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { BASE_URL } from "@/app/_constants/base-url";
import type { PageDetail } from "@/app/[locale]/types";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { NavigationData, PageTitleTree } from "../_db/queries";
import { ChildPages } from "./child-pages";
import { PageCommentForm } from "./comment/_components/page-comment-form/client";
import { PageCommentList } from "./comment/_components/page-comment-list/server";
import type { PageCommentsData } from "./comment/data";
import { ContentWithTranslations } from "./content-with-translations";
import { PageNavigation } from "./page-navigation";
import { PreviewBanner } from "./preview-banner";

export function collectAnnotationTypes(segments: PageDetail["segments"]) {
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

export function PageContent({
	pageDetail,
	locale,
	navigationData,
	childPages,
	description,
	likeButton,
	pageViewCounter,
	floatingControls,
	comments,
	commentCount,
}: {
	pageDetail: PageDetail;
	locale: string;
	navigationData: NavigationData | null;
	childPages: PageTitleTree[];
	description: string;
	likeButton: ReactNode;
	pageViewCounter: ReactNode;
	floatingControls: ReactNode;
	comments: PageCommentsData["comments"];
	commentCount: number;
}) {
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
			<PageNavigation
				data={navigationData}
				locale={locale}
				pageId={pageDetail.id}
			/>
			<ContentWithTranslations pageDetail={pageDetail} />
			<ChildPages locale={locale} pages={childPages} />
			<div className="flex flex-wrap items-center gap-4">
				<EyeIcon className="h-5 w-5" strokeWidth={1.5} />
				{pageViewCounter}
				{likeButton}
				<MessageCircle className="h-5 w-5" strokeWidth={1.5} />
				<span className="text-muted-foreground">{commentCount}</span>
			</div>

			{floatingControls}

			<div className="mt-8 space-y-4" id="comments">
				<h2 className="text-2xl font-bold not-prose">Comments</h2>
				<PageCommentForm pageId={pageDetail.id} userLocale={locale} />
				<PageCommentList comments={comments} userLocale={locale} />
			</div>
		</article>
	);
}
