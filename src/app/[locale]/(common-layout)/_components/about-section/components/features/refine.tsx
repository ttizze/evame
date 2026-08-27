import { getAboutCopy } from "../../copy";
import { FeatureSection } from "./feature-section";

export default function RefineFeature({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);
	const feature = copy.features[2];

	return (
		<FeatureSection
			decorationClassName="bottom-0 right-0 h-48 w-48 translate-x-1/3 translate-y-1/3 bg-[radial-gradient(circle,rgba(244,114,182,0.18),transparent_70%)]"
			header={feature.title}
			hint={
				locale === "ja"
					? "よりふさわしい訳に投票できます ↓"
					: "Vote for a faithful translation ↓"
			}
			panel={
				<div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
					<p className="text-sm leading-6">{feature.description}</p>
					<div className="flex gap-2 text-xs text-muted-foreground">
						<span className="rounded-full border border-border/60 px-3 py-1">
							↑ 12
						</span>
						<span className="rounded-full border border-border/60 px-3 py-1">
							↓ 1
						</span>
					</div>
				</div>
			}
			text={feature.description}
		/>
	);
}
