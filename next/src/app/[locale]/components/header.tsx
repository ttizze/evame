"use client";
import { useUser } from "@/contexts/user-context";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import { BaseHeaderLayout } from "./base-header-layout";
import { NewPageButton } from "./new-page-button";
import { StartButton } from "./start-button";

export function Header() {
	const { currentUser } = useUser();
	const rightExtra = (
		<>
			<Link href="/search">
				<Search className="w-6 h-6 " />
			</Link>
			{currentUser ? (
				<NewPageButton handle={currentUser.handle} />
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
			showUserMenu={!!currentUser} // ユーザーメニューはログイン時のみ表示
		/>
	);
}
