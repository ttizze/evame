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

		if (
			!pageWithTranslations ||
			pageWithTranslations.page.status === "ARCHIVE"
		) {
			return notFound();
		}
		const pageTitleWithTranslations =
			pageWithTranslations.segmentWithTranslations.find(
				(item) => item.segment?.number === 0,
			);
		if (!pageTitleWithTranslations) {
			return null;
		}
		let title: string;
		if (showTranslation && showOriginal) {
			title = `${pageTitleWithTranslations.segment.text} - ${pageTitleWithTranslations.bestSegmentTranslationWithVote?.segmentTranslation.text}`;
		} else if (showTranslation) {
			title =
				pageTitleWithTranslations.bestSegmentTranslationWithVote
					?.segmentTranslation.text ?? pageTitleWithTranslations.segment.text;
		} else {
			title = pageTitleWithTranslations.segment.text;
		}
		const guestId = await getGuestId();
		const [
			pageAITranslationInfo,
			userAITranslationInfo,
			pageCommentsCount,
		] = await Promise.all([
			fetchLatestPageAITranslationInfo(pageWithTranslations.page.id),
			fetchLatestUserAITranslationInfo(
				pageWithTranslations.page.id,
				currentUser?.id ?? "0",
			),
			fetchPageCommentsCount(pageWithTranslations.page.id),
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
