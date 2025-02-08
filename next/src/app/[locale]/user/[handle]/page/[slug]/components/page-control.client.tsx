"use client";

import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { FloatingControls } from "./floating-controls";

interface PageControlProps {
	likeCount: number;
	isLikedByUser: boolean;
	pageCommentsCount: number;
	slug: string;
	sourceTitleWithBestTranslationTitle: string;
}

export function PageControl({
	likeCount,
	isLikedByUser,
	pageCommentsCount,
	slug,
	sourceTitleWithBestTranslationTitle,
}: PageControlProps) {
	const [showOriginal, setShowOriginal] = useState(true);
	const [showTranslation, setShowTranslation] = useState(true);
	const shareUrl = typeof window !== "undefined" ? window.location.href : "";

	return (
		<>
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
				showOriginal={showOriginal}
				showTranslation={showTranslation}
				onToggleOriginal={() => setShowOriginal(!showOriginal)}
				onToggleTranslation={() => setShowTranslation(!showTranslation)}
				liked={isLikedByUser}
				likeCount={likeCount}
				slug={slug}
				shareUrl={shareUrl}
				shareTitle={sourceTitleWithBestTranslationTitle}
			/>
		</>
	);
}
