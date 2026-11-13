import { NuqsAdapter } from "nuqs/adapters/react";
import { type ReactNode, useEffect, useRef } from "react";
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
	const ready = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		const island = ready.current?.closest("astro-island");
		island?.setAttribute("data-reader-ready", "");
		island?.dispatchEvent(new Event("reader:ready"));
		return acquireToaster();
	}, []);
	return (
		<IntlProvider
			locale={locale}
			messages={messages[locale as keyof typeof messages] ?? messages.en}
			timeZone="UTC"
		>
			<NuqsAdapter serverSearch={search}>
				{children}
				<span hidden ref={ready} />
			</NuqsAdapter>
		</IntlProvider>
	);
}
