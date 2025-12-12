import useSWR from "swr";
import type { SanitizedUser } from "@/app/types";
import type { TranslationVote } from "@/drizzle/types";
import type { TranslationWithInfo } from "../types";

interface UseSegmentTranslationsParams {
	segmentId: number;
	userLocale: string;
	enabled: boolean;
	bestTranslationId: number;
}

interface SegmentTranslationsResponse {
	bestTranslationCurrentUserVote: TranslationVote | null;
	bestTranslationUser: SanitizedUser;
	translations: TranslationWithInfo[];
}

const fetcher = async (url: string): Promise<SegmentTranslationsResponse> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to fetch translations");
	}
	return response.json();
};

export function useSegmentTranslations({
	segmentId,
	userLocale,
	enabled,
	bestTranslationId,
}: UseSegmentTranslationsParams) {
	const key = enabled
		? `/api/segment-translations?segmentId=${segmentId}&userLocale=${userLocale}&bestTranslationId=${bestTranslationId}`
		: null;

	const { data, error, isLoading, mutate } =
		useSWR<SegmentTranslationsResponse>(key, fetcher);

	return { data, error, isLoading, mutate };
}
