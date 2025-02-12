"use client";
import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { MessageCircle } from "lucide-react";
import { useQueryState } from "nuqs";
import { ContentWithTranslations } from "./content-with-translations";
import { FloatingControls } from "./floating-controls";

import type { UserAITranslationInfo } from "@prisma/client";
import type { PageWithTranslations, SegmentWithTranslations } from "../types";
interface ContentControlContainerProps {
	pageWithTranslations: PageWithTranslations;
	pageSegmentTitleWithTranslations: SegmentWithTranslations | null;
	shareTitle: string;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	locale: string;
	liked: boolean;
	likeCount: number;
	pageCommentsCount: number;
}

export function ContentControlContainer({
	pageWithTranslations,
	pageSegmentTitleWithTranslations,
	shareTitle,
	currentHandle,
	hasGeminiApiKey,
	userAITranslationInfo,
	locale,
	liked,
	likeCount,
	pageCommentsCount,
}: ContentControlContainerProps) {
	const [queryShowOriginal, setQueryShowOriginal] = useQueryState(
		"showOriginal",
		{
			parse: (val) => val === "true",
			serialize: (val) => (val ? "true" : "false"),
			shallow: true,
		},
	);
	const [queryShowTranslation, setQueryShowTranslation] = useQueryState(
		"showTranslation",
		{
			parse: (val) => val === "true",
			serialize: (val) => (val ? "true" : "false"),
			shallow: true,
		},
	);

	return (
		<>
			<article className="w-full prose dark:prose-invert prose-a:underline prose-a:decoration-dotted sm:prose lg:prose-lg mx-auto px-4 mb-20">
				<ContentWithTranslations
					pageWithTranslations={pageWithTranslations}
					pageSegmentTitleWithTranslations={pageSegmentTitleWithTranslations}
					currentHandle={currentHandle}
					hasGeminiApiKey={hasGeminiApiKey}
					userAITranslationInfo={userAITranslationInfo}
					locale={locale}
					showOriginal={queryShowOriginal ?? true}
					showTranslation={queryShowTranslation ?? true}
				/>
			</article>
			<div className="flex items-center gap-4">
				<LikeButton
					liked={liked}
					likeCount={likeCount}
					slug={pageWithTranslations.page.slug}
					showCount={true}
				/>
				<MessageCircle className="w-6 h-6" strokeWidth={1.5} />
				<span>{pageCommentsCount}</span>
			</div>

			<FloatingControls
				liked={liked}
				likeCount={likeCount}
				slug={pageWithTranslations.page.slug}
				shareTitle={shareTitle}
				showOriginal={queryShowOriginal ?? true}
				setShowOriginal={setQueryShowOriginal}
				showTranslation={queryShowTranslation ?? true}
				setShowTranslation={setQueryShowTranslation}
			/>
		</>
	);
}
