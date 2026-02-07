import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { FeatureSection, fetchFeatureHeaderAndText } from "../feature-section";
import { SpreadAnimation } from "./spread-animation";

export default async function ReachFeature({ locale }: { locale: string }) {
	const featureContent = await fetchFeatureHeaderAndText({
		locale,
		headerNumber: SEGMENT_NUMBER.reachHeader,
		textNumber: SEGMENT_NUMBER.reachText,
	});

	if (!featureContent) return null;
	const { header, text } = featureContent;

	return (
		<FeatureSection
			decorationClassName="-left-20 -top-20 h-48 w-48 bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_70%)]"
			direction="reverse"
			header={<SegmentElement segment={header} tagName="span" />}
			panel={<SpreadAnimation />}
			text={<SegmentElement segment={text} tagName="span" />}
		/>
	);
}
