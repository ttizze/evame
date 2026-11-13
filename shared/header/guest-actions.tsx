import type { ReactNode } from "react";
import { LocaleSelector } from "@/app/[locale]/(common-layout)/_components/header/locale-selector/client";
import { TranslationHelpPopover } from "@/app/[locale]/(common-layout)/_components/header/translation-help-popover.client";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { HeaderSearchLink } from "./search-link";

export function HeaderGuestActions({
	locale,
	localeStatus,
}: {
	locale: string;
	localeStatus?: ReactNode;
}) {
	return (
		<div className="flex items-center gap-4">
			<TranslationHelpPopover inMenu={false} />
			<HeaderSearchLink locale={locale} />
			<LocaleSelector
				currentHandle={undefined}
				hasGeminiApiKey={false}
				inMenu={false}
				statusIcon={localeStatus}
				userPlan="free"
			/>
			<StartButton compactOnMobile />
		</div>
	);
}
