"use client";

import { BookOpenIcon, LogOutIcon } from "lucide-react";
import { getImageProps } from "next/image";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { LocaleSelector } from "@/app/[locale]/(common-layout)/_components/header/locale-selector/client";
import { ModeToggle } from "@/app/[locale]/(common-layout)/_components/header/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";

interface UserMenuProps {
	currentUser: { handle: string; name: string; image: string; plan: string };
	hasGeminiApiKey?: boolean;
}

export function UserMenu({
	currentUser,
	hasGeminiApiKey = false,
}: UserMenuProps) {
	const { props } = getImageProps({
		src: currentUser.image,
		alt: currentUser.name,
		width: 40,
		height: 40,
	});

	const handleSignOut = async () => {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						window.location.href = "/";
					},
				},
			});
		} catch (error) {
			console.error("Sign out error:", error);
		}
	};

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger>
				<Avatar className="w-6 h-6 cursor-pointer">
					<AvatarImage {...props} />
					<AvatarFallback>
						{currentUser.handle.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="m-2 p-0 rounded-xl min-w-40">
				<DropdownMenuItem className="p-0">
					<Link
						className="opacity-100 w-full rounded-none px-4 py-3  cursor-pointer hover:bg-accent hover:text-accent-foreground"
						href={`/${currentUser.handle}`}
					>
						<div className="flex flex-col items-start">
							{currentUser.name}
							<span className="text-xs text-gray-500">
								@{currentUser.handle}
							</span>
						</div>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator className="my-0" />
				<LocaleSelector
					currentHandle={currentUser.handle}
					hasGeminiApiKey={hasGeminiApiKey}
					localeSelectorClassName="w-[200px]"
					userPlan={currentUser.plan}
				/>
				<DropdownMenuSeparator className="my-0" />
				<DropdownMenuItem className="p-0 ">
					<Link
						className="flex items-center opacity-100 w-full rounded-none gap-2 px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
						href={`/${currentUser.handle}/page-management`}
					>
						<BookOpenIcon className="w-4 h-4" />
						Page Management
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<ModeToggle />
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<button
						className="w-full gap-2 flex rounded-none cursor-pointer items-center px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground text-red-500"
						onClick={handleSignOut}
						type="submit"
					>
						<LogOutIcon className="w-4 h-4" />
						Log out
					</button>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
