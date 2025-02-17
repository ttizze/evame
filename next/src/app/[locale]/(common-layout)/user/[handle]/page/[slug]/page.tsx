import { PageCommentForm } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/comment/components/page-comment-form";
import { PageCommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/comment/components/page-comment-list";
import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { getBestTranslation } from "@/app/[locale]/lib/get-best-translation";
import { stripHtmlTags } from "@/app/[locale]/lib/strip-html-tags";
import { fetchGeminiApiKeyByHandle } from "@/app/db/queries.server";
import { getCurrentUser } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { TranslateActionSection } from "../../../../../components/translate-action-section";
import { ContentWithTranslations } from "./components/content-with-translations";
import { FloatingControls } from "./components/floating-controls";
import { TranslateTarget } from "./constants";
import {
	fetchIsLikedByUser,
	fetchLatestUserAITranslationInfo,
	fetchLikeCount,
	fetchPageCommentsCount,
	fetchPageWithTranslations,
} from "./db/queries.server";

export const getPageData = cache(async (slug: string, locale: string) => {
	const currentUser = await getCurrentUser();

	const pageWithTranslations = await fetchPageWithTranslations(
		slug,
		locale,
		currentUser?.id,
	);

	if (!pageWithTranslations) {
		return null;
	}

	const pageSegmentTitleWithTranslations =
		pageWithTranslations.segmentWithTranslations.find(
			(item) => item.segment?.number === 0,
		);
	if (!pageSegmentTitleWithTranslations) {
		return null;
	}
	const bestTranslationTitle = getBestTranslation(
		pageSegmentTitleWithTranslations.segmentTranslationsWithVotes,
	);
	const sourceTitleWithBestTranslationTitle = bestTranslationTitle
		? `${pageSegmentTitleWithTranslations.segment.text} - ${bestTranslationTitle.segmentTranslation.text}`
		: pageSegmentTitleWithTranslations.segment.text;

	return {
		pageWithTranslations,
		currentUser,
		pageSegmentTitleWithTranslations,
		sourceTitleWithBestTranslationTitle,
		bestTranslationTitle,
	};
});
type Params = Promise<{ locale: string; handle: string; slug: string }>;

export async function generateMetadata({
	params,
}: { params: Params }): Promise<Metadata> {
	const { slug, locale } = await params;
	const data = await getPageData(slug, locale);
	if (!data) {
		return {
			title: "Page Not Found",
		};
	}
	const { pageWithTranslations, sourceTitleWithBestTranslationTitle } = data;
	const description = stripHtmlTags(pageWithTranslations.page.content).slice(
		0,
		200,
	);
	// const firstImageMatch = pageWithTranslations.page.content.match(
	// 	/<img[^>]+src="([^">]+)"/,
	// );

	const alternateLinks = pageWithTranslations.existLocales
		.filter(
			(locale: string) => pageWithTranslations.page.sourceLocale !== locale,
		)
		.map((locale: string) => ({
			tagName: "link",
			rel: "alternate",
			hrefLang: locale,
			href: `/${locale}/user/${pageWithTranslations.user.handle}/page/${pageWithTranslations.page.slug}`,
		}));

	return {
		title: sourceTitleWithBestTranslationTitle,
		description,
		openGraph: {
			type: "article",
			title: sourceTitleWithBestTranslationTitle,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title: sourceTitleWithBestTranslationTitle,
			description,
		},
		...alternateLinks,
	};
}

export default async function Page({ params }: { params: Params }) {
	const { slug, locale } = await params;
	const data = await getPageData(slug, locale);
	if (!data) {
		return notFound();
	}
	const {
		pageWithTranslations,
		sourceTitleWithBestTranslationTitle,
		currentUser,
	} = data;

	const guestId = await getGuestId();
	const geminiApiKey = await fetchGeminiApiKeyByHandle(
		currentUser?.handle ?? "",
	);
	const hasGeminiApiKey = !!geminiApiKey;

	const isOwner = pageWithTranslations?.user.handle === currentUser?.handle;
	if (
		pageWithTranslations.page.status === "ARCHIVE" ||
		(!isOwner && pageWithTranslations.page.status !== "PUBLIC")
	) {
		throw new Response("Page not found", { status: 404 });
	}

	const pageSegmentTitleWithTranslations =
		pageWithTranslations.segmentWithTranslations.filter(
			(item) => item.segment?.number === 0,
		)[0];

	const userAITranslationInfo = await fetchLatestUserAITranslationInfo(
		pageWithTranslations.page.id,
		currentUser?.id ?? "0",
		locale,
	);

	const [likeCount, isLikedByUser, pageCommentsCount] = await Promise.all([
		fetchLikeCount(pageWithTranslations.page.id),
		fetchIsLikedByUser(pageWithTranslations.page.id, currentUser?.id, guestId),
		fetchPageCommentsCount(pageWithTranslations.page.id),
	]);

	return (
		<div className="w-full max-w-3xl mx-auto">
			<article className="w-full prose dark:prose-invert prose-a:underline  sm:prose lg:prose-lg mx-auto px-4 mb-20">
				<ContentWithTranslations
					pageWithTranslations={pageWithTranslations}
					pageSegmentTitleWithTranslations={pageSegmentTitleWithTranslations}
					currentHandle={currentUser?.handle}
					hasGeminiApiKey={hasGeminiApiKey}
					userAITranslationInfo={userAITranslationInfo}
					locale={locale}
				/>
				<div className="flex items-center gap-4">
					<LikeButton
						liked={isLikedByUser}
						likeCount={likeCount}
						slug={slug}
						showCount
					/>
					<MessageCircle className="w-6 h-6" strokeWidth={1.5} />
					<span>{pageCommentsCount}</span>
				</div>

				<FloatingControls
					liked={isLikedByUser}
					likeCount={likeCount}
					slug={slug}
					shareTitle={sourceTitleWithBestTranslationTitle}
				/>

				<div className="mt-8">
					<div className="mt-8">
						<div className="flex items-center gap-2 py-2">
							<h2 className="text-2xl not-prose font-bold">Comments</h2>
							<TranslateActionSection
								pageId={pageWithTranslations.page.id}
								currentHandle={currentUser?.handle}
								userAITranslationInfo={userAITranslationInfo}
								hasGeminiApiKey={hasGeminiApiKey}
								sourceLocale={pageWithTranslations.page.sourceLocale}
								locale={locale}
								existLocales={pageWithTranslations.existLocales}
								translateTarget={TranslateTarget.TRANSLATE_COMMENT}
								showAddNew={true}
							/>
						</div>
						<PageCommentList
							pageId={pageWithTranslations.page.id}
							locale={locale}
						/>
					</div>
					<PageCommentForm
						pageId={pageWithTranslations.page.id}
						currentHandle={currentUser?.handle}
					/>
				</div>
			</article>
		</div>
	);
}
