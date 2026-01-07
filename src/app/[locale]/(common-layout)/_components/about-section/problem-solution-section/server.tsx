import {
	HandshakeIcon,
	LanguagesIcon,
	Pencil,
	TrendingUp,
	Users,
} from "lucide-react";
import Globe from "@/app/[locale]/(common-layout)/_components/about-section/problem-solution-section/components/globe.client";
import { PageLikeButton } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/server";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { FloatingControls } from "../../floating-controls/floating-controls.client";
import { fetchAboutPage } from "../_lib/fetch-about-page";
import AboutSectionCard from "./components/about-section-card.server";
import EditorMovie from "./components/editor-movie.server";
import Reactions from "./components/reaction.client";
import { SpreadOtherLanguage } from "./components/spread-other-language";
export default async function ProblemSolutionSection({
	locale,
}: {
	locale: string;
}) {
	const pageDetail = await fetchAboutPage(locale);
	// Get problem header (segment 2)
	const problemHeader = pageDetail.content.segments.find(
		(st) => st.number === 2,
	);
	// Get problem cards (segments 3-14)
	const problemCards = pageDetail.content.segments
		.filter((st) => st.number >= 3 && st.number <= 14)
		.sort((a, b) => a.number - b.number);

	// Group problem cards into pairs (header + text)
	const problemCardPairs = [] as {
		header: (typeof problemCards)[number];
		text: (typeof problemCards)[number];
	}[];
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
			alwaysVisible={true}
			key="component-5"
			likeButton={
				<PageLikeButton
					className="w-10 h-10 border rounded-full"
					initialLikeCount={pageDetail.likeCount}
					pageId={pageDetail.id}
					showCount={false}
				/>
			}
			position="w-full flex justify-center"
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
						<SegmentElement segment={problemHeader} tagName="span" />
					</h2>
				</div>
				<div className="grid grid-cols-1 ">
					{problemCardPairs.map((pair, index) => (
						<AboutSectionCard
							component={problemComponents[index]}
							description={
								<SegmentElement segment={pair.text} tagName="span" />
							}
							icon={problemIcons[index]}
							key={`problem-${pair.header.number}`}
							title={<SegmentElement segment={pair.header} tagName="span" />}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
