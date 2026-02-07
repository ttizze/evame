import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { FeatureSection, fetchFeatureHeaderAndText } from "../feature-section";
import { WriteCardUI } from "./card-ui";

export default async function WriteFeature({ locale }: { locale: string }) {
	const featureContent = await fetchFeatureHeaderAndText({
		locale,
		headerNumber: SEGMENT_NUMBER.writeHeader,
		textNumber: SEGMENT_NUMBER.writeText,
	});

	if (!featureContent) return null;
	const { header, text } = featureContent;

	return (
		<FeatureSection
			decorationClassName="right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_70%)]"
			header={<SegmentElement segment={header} tagName="span" />}
			panel={<WriteCardUI />}
			text={<SegmentElement segment={text} tagName="span" />}
		/>
	);
}
