import { Loader2, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { Link } from "@/i18n/routing";
import { StartButton } from "../start-button";
import { BaseHeader } from "./base-header.client";
import { LocaleSelector } from "./locale-selector/client";
import { NewPageButton } from "./new-page-button";

const NotificationsDropdown = dynamic(
	() => import("./notifications-dropdown").then((mod) => mod.default),
	{
		loading: () => <Loader2 className="w-6 h-6 animate-spin" />,
	},
);
export async function Header() {
	const currentUser = await getCurrentUser();
	const geminiApiKey = await fetchGeminiApiKeyByHandle(
		currentUser?.handle ?? "",
	);
	const hasGeminiApiKey =
		geminiApiKey !== null &&
		geminiApiKey !== undefined &&
		geminiApiKey.apiKey !== "";
	const rightExtra = (
		<>
			<Link aria-label="Search for pages" href="/search">
				<Search className="w-6 h-6 " />
			</Link>

			{!currentUser ? (
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
					<NotificationsDropdown currentUserHandle={currentUser.handle} />
					<NewPageButton handle={currentUser.handle} />
				</>
			)}
		</>
	);

	return (
		<BaseHeader
			currentUser={currentUser}
			hasGeminiApiKey={hasGeminiApiKey}
			leftExtra={null}
			rightExtra={rightExtra}
			showUserMenu={!!currentUser}
		/>
	);
}
