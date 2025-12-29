import type { SegmentElement, TranslatedElement } from "../../types";
import {
	getOrCreateAIUser,
	insertSegmentTranslations,
} from "../_db/mutations.server";
import { buildTranslationData } from "../_domain/build-translation-data";

export async function saveTranslations(
	extracted: TranslatedElement[],
	segments: SegmentElement[],
	locale: string,
	aiModel: string,
) {
	const userId = await getOrCreateAIUser(aiModel);
	const data = buildTranslationData(extracted, segments, locale, userId);
	await insertSegmentTranslations(data);
}
