import { SegmentAndTranslationSection } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/segment-and-translation-section";
import {
	ADD_TRANSLATION_FORM_TARGET,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { getCurrentUser } from "@/auth";
import {
	AlertCircle,
	DollarSign,
	Globe,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import AboutSectionCard from "../about-section-card";
import { fetchAboutPage } from "../lib/fetch-about-page";
export default async function ProblemSolutionSection({
	locale,
}: { locale: string }) {
	const currentUser = await getCurrentUser();
	const currentHandle = currentUser?.handle;
	const pageWithTranslations = await fetchAboutPage(locale);
	// Get problem header (segment 2)
	const problemHeader = pageWithTranslations.segmentWithTranslations.find(
		(st) => st.segment.number === 2,
	);
	// Get problem cards (segments 3-8)
	const problemCards = pageWithTranslations.segmentWithTranslations
		.filter((st) => st.segment.number >= 3 && st.segment.number <= 8)
		.sort((a, b) => a.segment.number - b.segment.number);

	// Get solution header (segment 9)
	const solutionHeader = pageWithTranslations.segmentWithTranslations.find(
		(st) => st.segment.number === 9,
	);

	// Get solution cards (segments 10-15)
	const solutionCards = pageWithTranslations.segmentWithTranslations
		.filter((st) => st.segment.number >= 10 && st.segment.number <= 15)
		.sort((a, b) => a.segment.number - b.segment.number);

	// Group problem cards into pairs (header + text)
	const problemCardPairs = [];
	for (let i = 0; i < problemCards.length; i += 2) {
		if (i + 1 < problemCards.length) {
			problemCardPairs.push({
				header: problemCards[i],
				text: problemCards[i + 1],
			});
		}
	}

	// Group solution cards into pairs (header + text)
	const solutionCardPairs = [];
	for (let i = 0; i < solutionCards.length; i += 2) {
		if (i + 1 < solutionCards.length) {
			solutionCardPairs.push({
				header: solutionCards[i],
				text: solutionCards[i + 1],
			});
		}
	}

	// Problem icons
	const problemIcons = [
		<div key="limited">
			<AlertCircle className="h-6 w-6 text-rose-500" />
		</div>,
		<div key="cost">
			<DollarSign className="h-6 w-6 text-amber-500" />
		</div>,
		<div key="opportunity">
			<Users className="h-6 w-6 text-emerald-500" />
		</div>,
	];

	// Solution icons with animations
	const solutionIcons = [
		<div key="global">
			<Globe className="h-6 w-6 text-sky-500" />
		</div>,
		<div key="free">
			<Zap className="h-6 w-6 text-indigo-500" />
		</div>,
		<div key="opportunity">
			<Sparkles className="h-6 w-6 text-fuchsia-500" />
		</div>,
	];
	if (
		!problemHeader ||
		!solutionHeader ||
		problemCardPairs.length === 0 ||
		solutionCardPairs.length === 0
	) {
		return null;
	}

	return (
		<div className="container mx-auto px-4 py-16">
			{/* Problem Section */}
			<div className="mb-16">
				<h2 className="text-3xl font-bold text-center mb-10">
					<SegmentAndTranslationSection
						segmentWithTranslations={problemHeader}
						elements={problemHeader.segment.text}
						currentHandle={currentHandle}
						voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
						addTranslationFormTarget={
							ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
						}
					/>
				</h2>

				<div className="grid grid-cols-1  gap-6">
					{problemCardPairs.map((pair, index) => (
						<AboutSectionCard
							key={`problem-${pair.header.segment.number}`}
							icon={problemIcons[index]}
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
						/>
					))}
				</div>
			</div>

			{/* Solution Section */}
			<div>
				<h2 className="text-3xl font-bold text-center mb-10">
					<SegmentAndTranslationSection
						segmentWithTranslations={solutionHeader}
						elements={solutionHeader.segment.text}
						currentHandle={currentHandle}
						voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
						addTranslationFormTarget={
							ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
						}
					/>
				</h2>

				<div className="grid grid-cols-1 gap-6">
					{solutionCardPairs.map((pair, index) => (
						<AboutSectionCard
							key={`solution-${pair.header.segment.number}`}
							icon={solutionIcons[index]}
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
						/>
					))}
				</div>
			</div>
		</div>
	);
}
