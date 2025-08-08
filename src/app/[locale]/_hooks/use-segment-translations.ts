import useSWR from "swr";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants";
import type { SanitizedUser } from "@/app/types";
import type { BaseTranslation, UserVote } from "../types";

interface UseSegmentTranslationsParams {
	segmentId: number;
	targetContentType: TargetContentType;
	locale: string;
	enabled: boolean;
	bestTranslationId?: number;
}

interface SegmentTranslationsResponse {
	bestTranslationCurrentUserVote?: UserVote;
	bestTranslationUser: SanitizedUser;
	translations: BaseTranslation[];
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
	targetContentType,
	locale,
	enabled,
	bestTranslationId,
}: UseSegmentTranslationsParams) {
	const key = enabled
		? `/api/segment-translations?segmentId=${segmentId}&targetContentType=${targetContentType}&locale=${locale}${bestTranslationId ? `&bestTranslationId=${bestTranslationId}` : ""}`
		: null;

	const { data, error, isLoading, mutate } =
		useSWR<SegmentTranslationsResponse>(key, fetcher, {
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
		});

	return { data, error, isLoading, mutate };
}
