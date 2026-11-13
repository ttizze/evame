import { NuqsAdapter } from "nuqs/adapters/react";
import { type ReactNode, useEffect } from "react";
import { IntlProvider } from "use-intl";
import { messages } from "@/i18n/messages";
import { acquireToaster } from "./toaster.client";

export function IslandProviders({
	locale,
	search,
	children,
}: {
	locale: string;
	search: string;
	children: ReactNode;
}) {
	useEffect(acquireToaster, []);
	return (
		<IntlProvider
			locale={locale}
			messages={messages[locale as keyof typeof messages] ?? messages.en}
			timeZone="UTC"
		>
			<NuqsAdapter serverSearch={search}>{children}</NuqsAdapter>
		</IntlProvider>
	);
}
