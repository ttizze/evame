import useSWR from "swr";
import {
	type SegmentTranslation,
	segmentTranslationSchema,
} from "@/app/api/segment-translations/_domain/segment-translations";

interface UseSegmentTranslationsParams {
	segmentId: number;
	userLocale: string;
	enabled: boolean;
}
export function useSegmentTranslations({
	segmentId,
	userLocale,
	enabled,
}: UseSegmentTranslationsParams) {
	const key = enabled
		? `/api/segment-translations?segmentId=${segmentId}&userLocale=${userLocale}`
		: null;

	const fetcher = async (url: string): Promise<SegmentTranslation[]> => {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Failed to fetch translations");
		}
		return segmentTranslationSchema.array().parse(await response.json());
	};

	const { data, error, isLoading, mutate } = useSWR<SegmentTranslation[]>(
		key,
		fetcher,
	);

	return { data, error, isLoading, mutate };
}
