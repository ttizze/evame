import { EyeIcon, MessageCircle } from "lucide-react";
import { FloatingControls } from "@/app/[locale]/_components/floating-controls.client";
import { PageLikeButtonClient } from "@/app/[locale]/_components/page/page-like-button/client";
import { PageViewCounter } from "@/app/[locale]/_components/page/page-view-counter/client";
import { PageCommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/server";
import type { fetchPageContext } from "../_lib/fetch-page-context";
import { ChildPages } from "./child-pages/server";
import { PageCommentForm } from "./comment/_components/page-comment-form/client";
import { ContentWithTranslations } from "./content-with-translations";
import { PageBreadcrumb } from "./page-breadcrumb/server";

interface PageContentProps {
	pageData: Awaited<ReturnType<typeof fetchPageContext>>;
	locale: string;
}

export async function PageContent({ pageData, locale }: PageContentProps) {
	const { pageDetail, pageViewCount } = pageData;

	const annotationLabel = (() => {
		for (const segment of pageDetail.content.segments) {
			if (segment.annotations && segment.annotations.length > 0) {
				for (const link of segment.annotations) {
					if (link.annotationSegment?.segmentType?.label) {
						return link.annotationSegment.segmentType.label;
					}
				}
			}
		}
		return undefined;
	})();

	const hasAnnotations = pageDetail.content.segments.some(
		(s) => s.annotations && s.annotations.length > 0,
	);

	return (
		<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
			<PageBreadcrumb locale={locale} pageDetail={pageDetail} />
			<ContentWithTranslations pageData={pageData} />
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
				annotationLabel={annotationLabel}
				hasAnnotations={hasAnnotations}
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
}
