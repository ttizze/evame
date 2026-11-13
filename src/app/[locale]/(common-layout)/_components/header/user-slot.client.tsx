import { Search } from "lucide-react";
import { lazy, Suspense } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { StartButton } from "../start-button";
import { LocaleSelector } from "./locale-selector/client";
import { NewPageButton } from "./new-page-button";
import { TranslationHelpPopover } from "./translation-help-popover.client";

const UserMenu = lazy(async () => ({
	default: (await import("./user-menu.client")).UserMenu,
}));

export function HeaderUserSlot({ locale }: { locale: string }) {
	const hydrated = useHydrated();

	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;
	const showLoading = !hydrated || isPending;

	return (
		<div className="flex items-center gap-4">
			{!showLoading && !currentUser && (
				<TranslationHelpPopover inMenu={false} />
			)}
			<a aria-label="Search for pages" href={`/${locale}/search`}>
				<Search className="w-6 h-6 " />
			</a>

			{showLoading ? (
				<div className="flex items-center gap-3">
					<Skeleton className="h-6 w-6 md:w-[150px] rounded-full" />
					<Skeleton className="h-6 w-6 md:w-20 rounded-full" />
				</div>
			) : !currentUser ? (
				<>
					<LocaleSelector
						currentHandle={undefined}
						hasGeminiApiKey={false}
						inMenu={false}
						userPlan="free"
					/>
					<StartButton compactOnMobile />
				</>
			) : (
				<>
					<NewPageButton handle={currentUser.handle} locale={locale} />
					<Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
						<UserMenu
							currentUser={currentUser}
							hasGeminiApiKey={session?.user.hasGeminiApiKey}
							locale={locale}
						/>
					</Suspense>
				</>
			)}
		</div>
	);
}
