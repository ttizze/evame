"use client";

import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { StartButton } from "../start-button";
import { LocaleSelector } from "./locale-selector/client";
import { NewPageButton } from "./new-page-button";
import { NotificationsDropdownClient } from "./notifications-dropdown/client";
import { UserMenu } from "./user-menu.client";

export function HeaderUserSlot() {
	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;

	return (
		<div className="flex items-center gap-4">
			<Link aria-label="Search for pages" href="/search">
				<Search className="w-6 h-6 " />
			</Link>

			{isPending ? (
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
