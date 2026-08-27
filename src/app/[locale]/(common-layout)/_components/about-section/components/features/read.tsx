import { getAboutCopy } from "../../copy";
import { FeatureSection } from "./feature-section";

export default function ReadFeature({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);
	const feature = copy.features[0];

	return (
		<FeatureSection
			decorationClassName="-bottom-24 -left-24 h-56 w-56 bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)]"
			direction="reverse"
			header={feature.title}
			hint={
				locale === "ja" ? "原文と訳文を切り替えてみる ↓" : "Read both views ↓"
			}
			panel={
				<div className="space-y-3 text-sm leading-7">
					<p
						className="rounded-lg border border-border/60 bg-background/80 p-3"
						lang="pi"
					>
						Evaṃ me sutaṃ: ekaṃ samayaṃ Bhagavā...
					</p>
					<p className="rounded-lg border border-border/60 bg-background/80 p-3 text-muted-foreground">
						{feature.description}
					</p>
				</div>
			}
			text={feature.description}
		/>
	);
}
