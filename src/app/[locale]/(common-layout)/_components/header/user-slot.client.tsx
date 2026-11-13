import { lazy, Suspense } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { ModeToggle } from "@/app/[locale]/(common-layout)/_components/header/mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderAccountFrame } from "../../../../../../shared/header/account-frame";
import { HeaderGuestActions } from "../../../../../../shared/header/guest-actions";
import { HeaderLoadingActions } from "../../../../../../shared/header/loading-actions";

const UserMenu = lazy(async () => ({
	default: (await import("./user-menu.client")).UserMenu,
}));

export function HeaderUserSlot({ locale }: { locale: string }) {
	const hydrated = useHydrated();

	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;
	const showLoading = !hydrated || isPending;

	if (showLoading) return <HeaderLoadingActions locale={locale} />;
	if (!currentUser) return <HeaderGuestActions locale={locale} />;
	return (
		<HeaderAccountFrame handle={currentUser.handle} locale={locale}>
			<Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
				<UserMenu
					currentUser={currentUser}
					defaultOpen={false}
					hasGeminiApiKey={currentUser.hasGeminiApiKey}
					initialUnreadCount={0}
					locale={locale}
					themeControl={<ModeToggle />}
				/>
			</Suspense>
		</HeaderAccountFrame>
	);
}
