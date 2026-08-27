import { supportedLocales } from "@/domain/locales";
import { getAboutCopy } from "../copy";
import { AboutSectionContent } from "./layout";

export default function SocialProofBar({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);
	const values = ["Pāli", "0", String(supportedLocales.length)];

	return (
		<AboutSectionContent className="py-10 md:py-12">
			<div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3 md:gap-6">
				{copy.stats.map((label, index) => (
					<div
						className="rounded-2xl border border-border/60 bg-card/80 px-4 py-6 shadow-sm backdrop-blur-sm"
						key={label}
					>
						<p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground md:text-3xl">
							{values[index]}
						</p>
						<span className="text-xs tracking-wide text-muted-foreground md:text-sm">
							{label}
						</span>
					</div>
				))}
			</div>
		</AboutSectionContent>
	);
}
