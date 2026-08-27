"use client";

import { LogOutIcon } from "lucide-react";
import { authClient } from "@/auth/client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleSelector } from "./locale-selector/client";
import { ModeToggle } from "./mode-toggle";

type CurrentUser = {
	handle: string;
	name: string;
	image?: string | null;
	plan?: string;
};

export function UserMenu({
	currentUser,
	locale = "en",
}: {
	currentUser: CurrentUser;
	locale?: string;
}) {
	const handleSignOut = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						window.location.href = `/${locale}`;
					},
				},
			});
		} catch {
			// 認証クライアントのエラーは画面へ機密情報を表示しない。
		}
	};

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<button
					aria-label={currentUser.name}
					className="flex h-6 w-6 cursor-pointer overflow-hidden rounded-full"
					type="button"
				>
					{currentUser.image ? (
						<img
							alt={currentUser.name}
							className="aspect-square h-full w-full"
							src={currentUser.image}
						/>
					) : (
						<span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
							{currentUser.handle.charAt(0).toUpperCase()}
						</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="m-2 min-w-40 rounded-xl p-0">
				<DropdownMenuItem className="p-0">
					<div className="flex w-full flex-col items-start px-4 py-3">
						{currentUser.name}
						<span className="text-xs text-gray-500">@{currentUser.handle}</span>
					</div>
				</DropdownMenuItem>
				<DropdownMenuSeparator className="my-0" />
				<LocaleSelector locale={locale} />
				<DropdownMenuSeparator className="my-0" />
				<DropdownMenuItem asChild>
					<ModeToggle />
				</DropdownMenuItem>
				<DropdownMenuItem className="p-0">
					<button
						className="flex w-full items-center gap-2 rounded-none px-4 py-3 text-sm text-red-500 hover:bg-accent hover:text-accent-foreground"
						onClick={handleSignOut}
						type="button"
					>
						<LogOutIcon className="h-4 w-4" />
						Log out
					</button>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
