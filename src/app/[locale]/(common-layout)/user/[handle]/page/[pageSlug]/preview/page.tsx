import { EyeIcon, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BASE_URL } from "@/app/_constants/base-url";
import { SourceLocaleBridge } from "@/app/_context/source-locale-bridge.client";
import { FloatingControls } from "@/app/[locale]/_components/floating-controls.client";
import { PageLikeButtonClient } from "@/app/[locale]/_components/page/page-like-button/client";
import { mdastToText } from "@/app/[locale]/_lib/mdast-to-text";
import { PageCommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/server";
import { getCurrentUser } from "@/lib/auth-server";
import { ChildPages } from "../_components/child-pages/server";
import { PageCommentForm } from "../_components/comment/_components/page-comment-form/client";
import { ContentWithTranslations } from "../_components/content-with-translations";
import { PageBreadcrumb } from "../_components/page-breadcrumb/server";
import { buildAlternateLocales } from "../_lib/build-alternate-locales";
import { fetchPageContext } from "../_lib/fetch-page-context";

type Params = Promise<{ locale: string; handle: string; pageSlug: string }>;

// Preview route is always dynamic and non-cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { pageSlug, locale } = await params;
	const data = await fetchPageContext(pageSlug, locale);
	const { pageDetail, pageTranslationJobs, title } = data;

	const description = await mdastToText(pageDetail.mdastJson).then((text) =>
		text.slice(0, 200),
	);
	const ogImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${pageSlug}`;
	return {
		title: `${title} (Preview)`,
		description,
		robots: { index: false, follow: false },
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

export default async function PreviewPage(
	props: PageProps<"/[locale]/user/[handle]/page/[pageSlug]/preview">,
) {
	const { pageSlug, locale, handle } = await props.params;

	// Only owner can preview
	const currentUser = await getCurrentUser();
	if (!currentUser || currentUser.handle !== handle) {
		return notFound();
	}

	const data = await fetchPageContext(pageSlug, locale);
	if (!data) return notFound();
	const { pageDetail, pageViewCount } = data;

	return (
		<>
			<SourceLocaleBridge locale={pageDetail.sourceLocale} />
			<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
				<div className="sticky top-0 z-50 w-full bg-secondary text-foreground rounded-xl">
					<div className="mx-auto max-w-5xl px-3 py-2 text-sm flex items-center justify-between">
						<span>Preview</span>
					</div>
				</div>
				<PageBreadcrumb locale={locale} pageDetail={pageDetail} />
				<ContentWithTranslations pageData={data} />
				<ChildPages locale={locale} parentId={pageDetail.id} />

				<div className="flex items-center gap-4">
					<EyeIcon className="w-5 h-5" strokeWidth={1.5} />
					{/* Avoid incrementing view counter in preview; show initial count */}
					<span className="text-muted-foreground">{pageViewCount}</span>
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
		</>
	);
}
