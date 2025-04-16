import { fetchPageWithTranslations } from "@/app/[locale]/_db/queries.server";
import { fetchLatestPageAITranslationInfo } from "@/app/[locale]/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
	fetchLatestUserAITranslationInfo,
	fetchPageCommentsCount,
} from "../_db/queries.server";

export const fetchPageContext = cache(
	async (
		slug: string,
		locale: string,
		showOriginal: boolean,
		showTranslation: boolean,
	) => {
		const currentUser = await getCurrentUser();

		const pageWithTranslations = await fetchPageWithTranslations(
			slug,
			locale,
			currentUser?.id,
		);

		if (!pageWithTranslations || pageWithTranslations.status === "ARCHIVE") {
			return notFound();
		}
		const pageTitleWithTranslations =
			pageWithTranslations.segmentWithTranslations.find(
				(item) => item.number === 0,
			);
		if (!pageTitleWithTranslations) {
			return null;
		}
		let title: string;
		if (showTranslation && showOriginal) {
			title = `${pageTitleWithTranslations.text} - ${pageTitleWithTranslations.bestSegmentTranslationWithVote?.text}`;
		} else if (showTranslation) {
			title =
				pageTitleWithTranslations.bestSegmentTranslationWithVote?.text ??
				pageTitleWithTranslations.text;
		} else {
			title = pageTitleWithTranslations.text;
		}
		const guestId = await getGuestId();
		const [pageAITranslationInfo, userAITranslationInfo, pageCommentsCount] =
			await Promise.all([
				fetchLatestPageAITranslationInfo(pageWithTranslations.id),
				fetchLatestUserAITranslationInfo(
					pageWithTranslations.id,
					currentUser?.id ?? "0",
				),
				fetchPageCommentsCount(pageWithTranslations.id),
			]);
		return {
			pageWithTranslations,
			currentUser,
			title,
			pageAITranslationInfo,
			userAITranslationInfo,
			pageCommentsCount,
		};
	},
);
