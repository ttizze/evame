import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { UserMenu } from "@/app/[locale]/(common-layout)/_components/header/user-menu.client";
import type { loadReaderHeader } from "@/app/api/reader-header/_service/load-reader-header";
import { HeaderAccountFrame } from "../../../shared/header/account-frame";
import { IslandProviders } from "./providers";
import { ReaderThemeToggle } from "./theme-toggle";

export function mountAccountHeader(
	container: HTMLElement,
	user: NonNullable<
		Awaited<ReturnType<typeof loadReaderHeader>>["data"]["user"]
	>,
	unreadCount: number,
	locale: string,
	search: string,
) {
	const root = createRoot(container);
	flushSync(() =>
		root.render(
			<IslandProviders locale={locale} search={search}>
				<HeaderAccountFrame handle={user.handle} locale={locale}>
					<UserMenu
						currentUser={user}
						defaultOpen={true}
						hasGeminiApiKey={user.hasGeminiApiKey}
						initialUnreadCount={unreadCount}
						locale={locale}
						themeControl={<ReaderThemeToggle />}
					/>
				</HeaderAccountFrame>
			</IslandProviders>,
		),
	);
	return root;
}
