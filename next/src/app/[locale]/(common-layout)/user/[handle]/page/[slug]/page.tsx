import { PageCommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/comment/_components/page-comment-list/server";
import { stripHtmlTags } from "@/app/[locale]/_lib/strip-html-tags";
import { BASE_URL } from "@/app/_constants/base-url";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsBoolean } from "nuqs/server";
import { buildAlternateLocales } from "./_lib/build-alternate-locales";
import { fetchPageContext } from "./_lib/fetch-page-context";
const DynamicContentWithTranslations = dynamic(
	() =>
		import("./_components/content-with-translations").then(
			(mod) => mod.ContentWithTranslations,
		),
	{
		loading: () => <Skeleton className="h-[500px] w-full" />,
	},
);
const DynamicPageLikeButton = dynamic(
	() =>
		import("@/app/[locale]/_components/page/page-like-button/server").then(
			(mod) => mod.PageLikeButton,
		),
	{
		loading: () => <span>Loading LikeButton...</span>,
	},
);

const DynamicFloatingControls = dynamic(
	() =>
		import("../../../../../_components/floating-controls.client").then(
			(mod) => mod.FloatingControls,
		),
	{
		loading: () => <span>Loading Controls...</span>,
	},
);
const DynamicTranslateActionSection = dynamic(
	() =>
		import("@/app/[locale]/_components/translate-action-section").then(
			(mod) => mod.TranslateActionSection,
		),
	{
		loading: () => <span>Loading Translate Section...</span>,
	},
);

const DynamicPageCommentForm = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/comment/_components/page-comment-form"
		).then((mod) => mod.PageCommentForm),
	{
		loading: () => <p>Loading Comment Form...</p>,
	},
);

type Params = Promise<{ locale: string; handle: string; slug: string }>;
const searchParamsSchema = {
	showOriginal: parseAsBoolean.withDefault(true),
	showTranslation: parseAsBoolean.withDefault(true),
};
const loadSearchParams = createLoader(searchParamsSchema);

export async function generateMetadata({
	params,
	searchParams,
}: { params: Params; searchParams: Promise<SearchParams> }): Promise<Metadata> {
	const { slug, locale } = await params;
	const { showOriginal, showTranslation } =
		await loadSearchParams(searchParams);
	const data = await fetchPageContext(
		slug,
		locale,
		showOriginal,
		showTranslation,
	);
	if (!data) {
		return {
			title: "Page Not Found",
		};
	}
	const { pageDetail, title, pageTranslationJobs } = data;
	const description = stripHtmlTags(pageDetail.content).slice(0, 200);
	const ogImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${slug}&showOriginal=${showOriginal}&showTranslation=${showTranslation}`;
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

export default async function Page({
	params,
	searchParams,
}: { params: Params; searchParams: Promise<SearchParams> }) {
	const { slug, locale } = await params;
	const { showOriginal, showTranslation } =
		await loadSearchParams(searchParams);
	const data = await fetchPageContext(
		slug,
		locale,
		showOriginal,
		showTranslation,
	);
	if (!data) {
		return notFound();
	}
	const {
		pageDetail,
		title,
		currentUser,
		pageCommentsCount,
		pageTranslationJobs,
		latestUserTranslationJob,
	} = data;

	const isOwner = pageDetail.user.handle === currentUser?.handle;
	if (!isOwner && pageDetail.status !== "PUBLIC") {
		return notFound();
	}

	return (
		<div className="w-full  mx-auto">
			<article className="w-full prose dark:prose-invert prose-a:underline  sm:prose lg:prose-lg mx-auto mb-20">
				<DynamicContentWithTranslations
					slug={slug}
					locale={locale}
					showOriginal={showOriginal}
					showTranslation={showTranslation}
				/>
				<div className="flex items-center gap-4">
					<DynamicPageLikeButton pageId={pageDetail.id} showCount />
					<MessageCircle className="w-6 h-6" strokeWidth={1.5} />
					<span>{pageCommentsCount}</span>
				</div>

				<DynamicFloatingControls
					likeButton={
						<DynamicPageLikeButton
							pageId={pageDetail.id}
							showCount={false}
							className="w-12 h-12 border rounded-full"
						/>
					}
					shareTitle={title}
				/>

				<div className="mt-8">
					<div className="mt-8" id="comments">
						<div className="flex items-center gap-2 py-2">
							<h2 className="text-2xl not-prose font-bold">Comments</h2>
							<DynamicTranslateActionSection
								pageId={pageDetail.id}
								currentHandle={currentUser?.handle}
								latestUserTranslationJob={latestUserTranslationJob}
								translationJobs={pageTranslationJobs}
								sourceLocale={pageDetail.sourceLocale}
								targetContentType="comment"
								showIcons={false}
							/>
						</div>
						<PageCommentList pageId={pageDetail.id} locale={locale} />
					</div>
					<DynamicPageCommentForm
						pageId={pageDetail.id}
						currentHandle={currentUser?.handle}
					/>
				</div>
			</article>
		</div>
	);
}
