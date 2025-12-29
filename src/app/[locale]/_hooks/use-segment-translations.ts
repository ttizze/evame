import useSWR from "swr";
import type { TranslationWithInfo } from "../types";

interface UseSegmentTranslationsParams {
	segmentId: number;
	userLocale: string;
	enabled: boolean;
}

type TranslationWithInfoApi = Omit<TranslationWithInfo, "createdAt"> & {
	createdAt: string;
};

interface SegmentTranslationsResponseApi {
	bestTranslation: TranslationWithInfoApi | null;
	translations: TranslationWithInfoApi[];
}

interface SegmentTranslationsResponse {
	bestTranslation: TranslationWithInfo | null;
	translations: TranslationWithInfo[];
}

const fetcher = async (url: string): Promise<SegmentTranslationsResponse> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to fetch translations");
	}
	const json = (await response.json()) as SegmentTranslationsResponseApi;

	return {
		bestTranslation: json.bestTranslation
			? {
					...json.bestTranslation,
					createdAt: new Date(json.bestTranslation.createdAt),
				}
			: null,
		translations: json.translations.map((t) => ({
			...t,
			createdAt: new Date(t.createdAt),
		})),
	};
};

export function useSegmentTranslations({
	segmentId,
	userLocale,
	enabled,
}: UseSegmentTranslationsParams) {
	const key = enabled
		? `/api/segment-translations?segmentId=${segmentId}&userLocale=${userLocale}`
		: null;

	const { data, error, isLoading, mutate } =
		useSWR<SegmentTranslationsResponse>(key, fetcher);

	return { data, error, isLoading, mutate };
}
