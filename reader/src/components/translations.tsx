import { createRoot } from "react-dom/client";
import { AddAndVoteTranslations } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/add-and-vote-translations.client";
import { IslandProviders } from "./providers";

export function mountTranslation(
	container: HTMLElement,
	segmentId: number,
	locale: string,
	search: string,
) {
	const root = createRoot(container);
	root.render(
		<IslandProviders locale={locale} search={search}>
			<AddAndVoteTranslations open segmentId={segmentId} />
		</IslandProviders>,
	);
	return root;
}
