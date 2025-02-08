import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { PageCommentForm } from "@/app/[locale]/user/[handle]/page/[slug]/comment/components/page-comment-form";
import { PageCommentList } from "@/app/[locale]/user/[handle]/page/[slug]/comment/components/page-comment-list";
import { fetchGeminiApiKeyByHandle } from "@/app/db/queries.server";
import { auth } from "@/auth";
import { ensureGuestId } from "@/lib/ensure-guest-id.server";
import { MessageCircle } from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ContentWithTranslations } from "./components/content-with-translations";
import { FloatingControls } from "./components/floating-controls";
import { TranslateActionSection } from "./components/translate-button/translate-action-section";
import { TranslateTarget } from "./constants";
import {
	fetchIsLikedByUser,
	fetchLatestUserAITranslationInfo,
	fetchLikeCount,
	fetchPageCommentsCount,
	fetchPageWithTranslations,
} from "./db/queries.server";
import { getBestTranslation } from "./lib/get-best-translation";
import { stripHtmlTags } from "./lib/strip-html-tags";
type Props = {
	params: Promise<{ locale: string; handle: string; slug: string }>;
	searchParams: Promise<{ showOriginal?: string; showTranslation?: string }>;
};

export const getPageData = cache(async (slug: string, locale: string) => {
	const session = await auth();
	const currentUser = session?.user;

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

export async function generateMetadata(
	{ params }: Props,
	parent: ResolvingMetadata,
): Promise<Metadata> {
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
	const firstImageMatch = pageWithTranslations.page.content.match(
		/<img[^>]+src="([^">]+)"/,
	);

	const imageUrl = firstImageMatch
		? firstImageMatch[1]
		: pageWithTranslations.user.image;

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
			images: imageUrl,
		},
		twitter: {
			card: "summary_large_image",
			title: sourceTitleWithBestTranslationTitle,
			description,
			images: imageUrl,
		},
		...alternateLinks,
	};
}

export default async function Page({ params, searchParams }: Props) {
	const { slug, locale } = await params;
	const resolvedSearchParams = await searchParams;
	const data = await getPageData(slug, locale);
	if (!data) {
		return notFound();
	}
	const { pageWithTranslations, sourceTitleWithBestTranslationTitle } = data;
	const session = await auth();
	const currentUser = session?.user;

	const guestId = await ensureGuestId();

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

	const showOriginal = resolvedSearchParams.showOriginal !== "false";
	const showTranslation = resolvedSearchParams.showTranslation !== "false";
	console.log(showOriginal, showTranslation);

	return (
		<div className="w-full max-w-3xl mx-auto">
			<article className="w-full prose dark:prose-invert prose-a:underline prose-a:decoration-dotted sm:prose lg:prose-lg mx-auto px-4 mb-20">
				<ContentWithTranslations
					pageWithTranslations={pageWithTranslations}
					pageSegmentWithTranslations={pageSegmentTitleWithTranslations}
					currentHandle={currentUser?.handle}
					hasGeminiApiKey={hasGeminiApiKey}
					userAITranslationInfo={userAITranslationInfo}
					locale={locale}
					existLocales={pageWithTranslations.existLocales}
					showOriginal={showOriginal}
					showTranslation={showTranslation}
				/>
			</article>
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
				initialShowOriginal={showOriginal}
				initialShowTranslation={showTranslation}
			/>

			<div className="mt-8">
				<div className="mt-8">
					<div className="flex items-center gap-2 py-2">
						<h2 className="text-2xl font-bold">Comments</h2>
						<TranslateActionSection
							pageId={pageWithTranslations.page.id}
							currentHandle={currentUser?.handle}
							userAITranslationInfo={userAITranslationInfo}
							hasGeminiApiKey={hasGeminiApiKey}
							sourceLocale={pageWithTranslations.page.sourceLocale}
							locale={locale}
							existLocales={pageWithTranslations.existLocales}
							translateTarget={TranslateTarget.TRANSLATE_COMMENT}
						/>
					</div>
					<PageCommentList
						pageId={pageWithTranslations.page.id}
						currentHandle={currentUser?.handle}
						showOriginal={showOriginal}
						showTranslation={showTranslation}
						locale={locale}
					/>
				</div>
				<PageCommentForm
					pageId={pageWithTranslations.page.id}
					currentHandle={currentUser?.handle}
				/>
			</div>
		</div>
	);
}
