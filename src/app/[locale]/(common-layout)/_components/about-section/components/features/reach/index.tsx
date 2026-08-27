import { getAboutCopy } from "../../../copy";
import { FeatureSection } from "../feature-section";
import { SpreadAnimation } from "./spread-animation";

export default function ReachFeature({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);
	const feature = copy.features[3];

	return (
		<FeatureSection
			decorationClassName="left-0 top-0 h-48 w-48 -translate-x-1/3 -translate-y-1/3 bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_70%)]"
			direction="reverse"
			header={feature.title}
			panel={<SpreadAnimation />}
			text={feature.description}
		/>
	);
}
