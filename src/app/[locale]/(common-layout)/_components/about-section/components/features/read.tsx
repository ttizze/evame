import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { FloatingControls } from "../../../floating-controls/floating-controls.client";
import { FeatureSection, fetchFeatureHeaderAndText } from "./feature-section";

const READ_HINT: Record<string, string> = {
	ja: "表示を切り替えてみる ↓",
	en: "Try switching the view ↓",
	zh: "试试切换显示 ↓",
	ko: "표시를 전환해보기 ↓",
	es: "Prueba cambiar la vista ↓",
};

export default async function ReadFeature({ locale }: { locale: string }) {
	const featureContent = await fetchFeatureHeaderAndText({
		locale,
		headerNumber: SEGMENT_NUMBER.readHeader,
		textNumber: SEGMENT_NUMBER.readText,
	});

	if (!featureContent) return null;
	const { pageDetail, header, text } = featureContent;

	return (
		<FeatureSection
			decorationClassName="-left-24 -bottom-24 h-56 w-56 bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)]"
			direction="reverse"
			header={<SegmentElement segment={header} tagName="span" />}
			hint={READ_HINT[locale] ?? READ_HINT.en}
			panel={
				<FloatingControls
					alwaysVisible={true}
					position="w-full flex justify-center"
					sourceLocale={pageDetail.sourceLocale}
					userLocale={locale}
				/>
			}
			text={<SegmentElement segment={text} tagName="span" />}
		/>
	);
}
