import { getCurrentUser } from "@/auth";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import { StartButton } from "../start-button";
import { BaseHeaderLayout } from "./base-header-layout";
import { NewPageButton } from "./new-page-button";
import dynamic from "next/dynamic";

const NotificationsDropdown = dynamic(
	() => import("./notifications-dropdown").then((mod) => mod.default),
	{
		loading: () => <div>Loading...</div>,
	},
);
export async function Header() {
	const currentUser = await getCurrentUser();

	const rightExtra = (
		<>
			<Link href="/search">
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
		<BaseHeaderLayout
			currentUser={currentUser}
			leftExtra={null}
			rightExtra={rightExtra}
			showUserMenu={!!currentUser}
		/>
	);
}
