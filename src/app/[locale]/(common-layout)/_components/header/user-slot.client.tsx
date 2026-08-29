"use client";

import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { StartButton } from "../start-button";
import { LocaleSelector } from "./locale-selector/client";
import { NotificationsDropdownClient } from "./notifications-dropdown/client";
import { TranslationHelpPopover } from "./translation-help-popover.client";
import { UserMenu } from "./user-menu.client";

export function HeaderUserSlot({ locale }: { locale: string }) {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);

	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;
	const showLoading = !hydrated || isPending;

	return (
		<div className="flex items-center gap-4">
			<TranslationHelpPopover />
			<Link
				aria-label="Search for pages"
				params={{ locale }}
				preload={false}
				to="/$locale/search"
			>
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
					<NotificationsDropdownClient locale={locale} />
					<UserMenu
						currentUser={currentUser}
						hasGeminiApiKey={session?.user.hasGeminiApiKey}
						locale={locale}
					/>
				</>
			)}
		</div>
	);
}
