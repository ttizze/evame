import { HeaderGuestActions } from "../../../shared/header/guest-actions";
import { IslandProviders } from "./providers";

export function ReaderGuestHeader({
	locale,
	search,
}: {
	locale: string;
	search: string;
}) {
	return (
		<IslandProviders locale={locale} search={search}>
			<HeaderGuestActions locale={locale} />
		</IslandProviders>
	);
}
