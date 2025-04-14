import { SegmentAndTranslationSection } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/segment-and-translation-section";
import {
	ADD_TRANSLATION_FORM_TARGET,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { getCurrentUser } from "@/auth";
import { LanguagesIcon, Pencil, TrendingUp } from "lucide-react";
import AboutSectionCard from "../about-section-card";
import { fetchAboutPage } from "../lib/fetch-about-page";
import EditorMovie from "./editor-movie";
export default async function FeatureSection({ locale }: { locale: string }) {
	const currentUser = await getCurrentUser();
	const currentHandle = currentUser?.handle;
	const pageWithTranslations = await fetchAboutPage(locale);

	// Get feature header (segment 16)
	const featureHeader = pageWithTranslations.segmentWithTranslations.find(
		(st) => st.segment.number === 16,
	);

	// Get feature cards (segments 17-22)
	const featureSegments = pageWithTranslations.segmentWithTranslations
		.filter((st) => st.segment.number >= 17 && st.segment.number <= 22)
		.sort((a, b) => a.segment.number - b.segment.number);

	// Group feature segments into pairs (header + text)
	const featureCardPairs = [];
	for (let i = 0; i < featureSegments.length; i += 2) {
		if (i + 1 < featureSegments.length) {
			featureCardPairs.push({
				header: featureSegments[i],
				text: featureSegments[i + 1],
			});
		}
	}

	// Feature icons
	const featureIcons = [
		<div key="translation">
			<LanguagesIcon className="h-6 w-6 text-cyan-500" />
		</div>,
		<div key="editor">
			<Pencil className="h-6 w-6 text-violet-500" />
		</div>,
		<div key="improvement">
			<TrendingUp className="h-6 w-6 text-teal-500" />
		</div>,
	];
	const featureComponents = [
		<EditorMovie key="component-1" />,
		// Add your second component here
		<EditorMovie key="component-2" />,
		<EditorMovie key="component-3" />,
	];
	if (!featureHeader || featureCardPairs.length === 0) {
		return null;
	}

	return (
		<div className="container mx-auto px-4 py-16">

			<div className="grid grid-cols-1 gap-8">
				{featureCardPairs.map((pair, index) => (
					<AboutSectionCard
						key={`feature-${pair.header.segment.number}`}
						icon={featureIcons[index]}
						title={
							<SegmentAndTranslationSection
								segmentWithTranslations={pair.header}
								elements={pair.header.segment.text}
								currentHandle={currentHandle}
								voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
								addTranslationFormTarget={
									ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
								}
							/>
						}
						description={
							<SegmentAndTranslationSection
								segmentWithTranslations={pair.text}
								elements={pair.text.segment.text}
								currentHandle={currentHandle}
								voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
								addTranslationFormTarget={
									ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
								}
							/>
						}
						component={<EditorMovie />}
					/>
				))}
			</div>
		</div>
	);
}
