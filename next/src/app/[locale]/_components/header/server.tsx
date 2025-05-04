import { getCurrentUser } from "@/auth";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { StartButton } from "../start-button";
import { BaseHeader } from "./base-header";
import { NewPageButton } from "./new-page-button";

const DynamicTranslateActionSection = dynamic(
	() =>
		import("./translate-action-section/server").then(
			(mod) => mod.TranslateActionSection,
		),
	{
		loading: () => <Loader2 className="w-6 h-6 animate-spin" />,
	},
);

const NotificationsDropdown = dynamic(
	() => import("./notifications-dropdown").then((mod) => mod.default),
	{
		loading: () => <Loader2 className="w-6 h-6 animate-spin" />,
	},
);
export async function Header() {
	const currentUser = await getCurrentUser();

	const rightExtra = (
		<>
			<DynamicTranslateActionSection currentHandle={currentUser?.handle} />
			<Link href="/search" aria-label="Search for pages">
				<Search className="w-6 h-6 " />
			</Link>
			{currentUser ? (
				<>
					<NotificationsDropdown currentUserHandle={currentUser.handle} />
					<NewPageButton handle={currentUser.handle} />
				</>
			) : (
				<StartButton />
			)}
		</>
	);

	return (
		<BaseHeader
			currentUser={currentUser}
			leftExtra={null}
			rightExtra={rightExtra}
			showUserMenu={!!currentUser}
		/>
	);
}
