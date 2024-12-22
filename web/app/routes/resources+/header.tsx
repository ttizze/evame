import { data } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { NavLink } from "@remix-run/react";
import { Search } from "lucide-react";
import { BaseHeaderLayout } from "~/components/BaseHeaderLayout";
import { StartButton } from "~/components/StartButton";
import type { SanitizedUser } from "~/types";
import { authenticator } from "~/utils/auth.server";
import { NewPageButton } from "./components/NewPageButton";

interface HeaderProps {
	currentUser: SanitizedUser | null;
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.clone().formData();
	const intent = formData.get("intent");

	if (intent === "logout") {
		return await authenticator.logout(request, { redirectTo: "/" });
	}

	if (intent === "SignInWithGoogle") {
		const user = await authenticator.authenticate("google", request);

		if (user) {
			return redirect(`/user/${user.userName}`);
		}

		return redirect("/auth/login");
	}

	return data({ error: "Invalid intent" }, { status: 400 });
}

export function Header({ currentUser }: HeaderProps) {
	const rightExtra = (
		<>
			<NavLink
				to="/search"
				className={({ isPending }) =>
					isPending
						? "opacity-50"
						: "opacity-100 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white justify-self-end"
				}
			>
				<Search className="w-6 h-6 " />
			</NavLink>
			{currentUser ? (
				<NewPageButton userName={currentUser.userName} />
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
