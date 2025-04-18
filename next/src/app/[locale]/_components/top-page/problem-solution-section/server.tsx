import {
	ADD_TRANSLATION_FORM_TARGET,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { PageLikeButton } from "@/app/[locale]/_components/page/page-like-button/server";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import Globe from "@/app/[locale]/_components/top-page/problem-solution-section/components/globe.client";
import { getCurrentUser } from "@/auth";
import {
	HandshakeIcon,
	LanguagesIcon,
	Pencil,
	TrendingUp,
	Users,
} from "lucide-react";
import { fetchAboutPage } from "../../../(common-layout)/about/_lib/fetch-about-page";
import { FloatingControls } from "../../floating-controls.client";
import AboutSectionCard from "./components/about-section-card.server";
import EditorMovie from "./components/editor-movie.server";
import Reactions from "./components/reaction.client";
import { SpreadOtherLanguage } from "./components/spread-other-language";
export default async function ProblemSolutionSection({
	locale,
}: { locale: string }) {
	const currentUser = await getCurrentUser();
	const currentHandle = currentUser?.handle;
	const pageDetail = await fetchAboutPage(locale);
	// Get problem header (segment 2)
	const problemHeader = pageDetail.segmentBundles.find(
		(st) => st.segment.number === 2,
	);
	// Get problem cards (segments 3-8)
	const problemCards = pageDetail.segmentBundles
		.filter((st) => st.segment.number >= 3 && st.segment.number <= 14)
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

	// Problem icons
	const problemIcons = [
		<div key="limited">
			<LanguagesIcon className="h-6 w-6 " />
		</div>,
		<div key="cost">
			<HandshakeIcon className="h-6 w-6 " />
		</div>,
		<div key="opportunity">
			<Users className="h-6 w-6 " />
		</div>,
		<div key="translation">
			<LanguagesIcon className="h-6 w-6" />
		</div>,
		<div key="editor">
			<Pencil className="h-6 w-6 " />
		</div>,
		<div key="improvement">
			<TrendingUp className="h-6 w-6 " />
		</div>,
	];
	const problemComponents = [
		<SpreadOtherLanguage key="component-1" />,
		// Add your second component here
		<Reactions key="component-2" />,
		<Globe key="component-3" />,
		<EditorMovie key="component-4" />,
		<FloatingControls
			likeButton={<PageLikeButton pageId={pageDetail.id} showCount={false} />}
			shareTitle="evame"
			position="w-full flex justify-center"
			alwaysVisible={true}
			key="component-5"
		/>,
		<span key="component-6" />,
	];

	if (!problemHeader || problemCardPairs.length === 0) {
		return null;
	}

	return (
		<div className="pt-16 border-x">
			{/* Problem Section */}
			<div className="">
				<div className="border-b">
					<h2 className="text-2xl font-bold text-center mb-10">
						<SegmentAndTranslationSection
							segmentBundle={problemHeader}
							currentHandle={currentHandle}
							voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
							addTranslationFormTarget={
								ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
							}
						/>
					</h2>
				</div>
				<div className="grid grid-cols-1 ">
					{problemCardPairs.map((pair, index) => (
						<AboutSectionCard
							key={`problem-${pair.header.segment.number}`}
							icon={problemIcons[index]}
							title={
								<SegmentAndTranslationSection
									segmentBundle={pair.header}
									currentHandle={currentHandle}
									voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
									addTranslationFormTarget={
										ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
									}
								/>
							}
							description={
								<SegmentAndTranslationSection
									segmentBundle={pair.text}
									currentHandle={currentHandle}
									voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
									addTranslationFormTarget={
										ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
									}
								/>
							}
							component={problemComponents[index]}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
