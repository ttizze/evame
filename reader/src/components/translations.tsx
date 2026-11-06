import { TranslationFormOnClick } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click.client";
import { IslandProviders } from "./providers";

export function TranslationsIsland({
	locale,
	pathname,
}: {
	locale: string;
	pathname: string;
}) {
	return (
		<IslandProviders locale={locale}>
			<TranslationFormOnClick pathname={pathname} />
		</IslandProviders>
	);
}
