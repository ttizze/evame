import { TranslationFormOnClick } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click.client";
import { IslandProviders } from "./providers";

export function TranslationsIsland({
	locale,
	search,
	pathname,
}: {
	locale: string;
	search: string;
	pathname: string;
}) {
	return (
		<IslandProviders locale={locale} search={search}>
			<TranslationFormOnClick pathname={pathname} />
		</IslandProviders>
	);
}
