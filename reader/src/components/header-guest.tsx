import type { ReactNode } from "react";
import { HeaderGuestActions } from "../../../shared/header/guest-actions";
import { IslandProviders } from "./providers";

export function ReaderGuestHeader({
	locale,
	search,
	localeStatus,
}: {
	locale: string;
	search: string;
	localeStatus: ReactNode;
}) {
	return (
		<IslandProviders locale={locale} search={search}>
			<HeaderGuestActions locale={locale} localeStatus={localeStatus} />
		</IslandProviders>
	);
}
