"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { StartButton } from "../start-button";
import { LocaleSelector } from "./locale-selector/client";
import { NewPageButton } from "./new-page-button";
import { NotificationsDropdownClient } from "./notifications-dropdown/client";
import { TranslationHelpPopover } from "./translation-help-popover.client";
import { UserMenu } from "./user-menu.client";

export function HeaderUserSlot() {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);

	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;
	const showLoading = !hydrated || isPending;

	return (
		<div className="flex items-center gap-4">
			<TranslationHelpPopover />
			<Link aria-label="Search for pages" href="/search">
				<Search className="w-6 h-6 " />
			</Link>

			{showLoading ? (
				<div className="flex items-center gap-3">
					<Skeleton className="h-6 w-[150px] rounded-full" />
					<Skeleton className="h-6 w-20 rounded-full" />
				</div>
			) : !currentUser ? (
				<>
					<LocaleSelector
						currentHandle={undefined}
						hasGeminiApiKey={false}
						localeSelectorClassName="border rounded-full w-[150px]"
						userPlan="free"
					/>
					<StartButton />
				</>
			) : (
				<>
					<NotificationsDropdownClient currentUserHandle={currentUser.handle} />
					<NewPageButton handle={currentUser.handle} />
					<UserMenu
						currentUser={currentUser}
						hasGeminiApiKey={session?.user.hasGeminiApiKey}
					/>
				</>
			)}
		</div>
	);
}
