import type { ComponentProps } from "react";
import AboutSectionPresentation from "@/app/[locale]/(common-layout)/_components/about-section/presentation";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { IslandProviders } from "./providers";

export function AboutIsland({
	locale,
	pageDetail,
	stats,
}: Pick<
	ComponentProps<typeof AboutSectionPresentation>,
	"locale" | "pageDetail" | "stats"
>) {
	return (
		<IslandProviders locale={locale}>
			<AboutSectionPresentation
				floatingControls={null}
				locale={locale}
				pageDetail={pageDetail}
				readControls={
					<FloatingControls
						alwaysVisible
						position="w-full flex justify-center"
						sourceLocale={pageDetail.sourceLocale}
						userLocale={locale}
					/>
				}
				stats={stats}
			/>
		</IslandProviders>
	);
}
