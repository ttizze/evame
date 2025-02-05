import { data } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Search } from "lucide-react";
import { BaseHeaderLayout } from "~/components/BaseHeaderLayout";
import { NavLocaleLink } from "~/components/NavLocaleLink";
import { StartButton } from "~/components/StartButton";
import type { SanitizedUser } from "~/types";
import { authenticator } from "~/utils/auth.server";
import { NewPageButton } from "./components/NewPageButton";
interface HeaderProps {
	currentUser: SanitizedUser | null;
	locale: string;
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
			return redirect(`/user/${user.handle}`);
		}

		return redirect("/auth/login");
	}

	return data({ error: "Invalid intent" }, { status: 400 });
}

export function Header({ currentUser, locale }: HeaderProps) {
	const rightExtra = (
		<>
			<NavLocaleLink
				to="/search"
				className={({ isPending }) =>
					isPending
						? "opacity-50"
						: "opacity-100 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white justify-self-end"
				}
			>
				<Search className="w-6 h-6 " />
			</NavLocaleLink>
			{currentUser ? (
				<NewPageButton handle={currentUser.handle} locale={locale} />
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
