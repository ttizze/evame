import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { FeatureSection, fetchFeatureHeaderAndText } from "./feature-section";

const VOTE_HINT: Record<string, string> = {
	ja: "訳文をクリックで投票を試す ↓",
	en: "Click translation to try voting ↓",
	zh: "点击译文尝试投票 ↓",
	ko: "번역문을 클릭하여 투표해보기 ↓",
	es: "Haz clic en la traducción para votar ↓",
};

export default async function RefineFeature({ locale }: { locale: string }) {
	const featureContent = await fetchFeatureHeaderAndText({
		locale,
		headerNumber: SEGMENT_NUMBER.refineHeader,
		textNumber: SEGMENT_NUMBER.refineText,
	});

	if (!featureContent) return null;
	const { header, text } = featureContent;

	return (
		<FeatureSection
			decorationClassName="-right-20 -bottom-20 h-48 w-48 bg-[radial-gradient(circle,rgba(244,114,182,0.18),transparent_70%)]"
			header={<SegmentElement segment={header} tagName="span" />}
			hint={VOTE_HINT[locale] ?? VOTE_HINT.en}
			panel={
				<div className="rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-background">
					<SegmentElement segment={text} tagName="span" />
				</div>
			}
			text={<SegmentElement segment={text} tagName="span" />}
		/>
	);
}
