import { Link } from "@remix-run/react";
import { LocaleLink } from "~/components/LocaleLink";
import { NavLocaleLink } from "~/components/NavLocaleLink";
import { Form, NavLink } from "@remix-run/react";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ModeToggle } from "~/components/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { SanitizedUser } from "~/types";

interface BaseHeaderLayoutProps {
	currentUser: SanitizedUser | null;
	leftExtra?: ReactNode;
	rightExtra?: ReactNode;
	showUserMenu?: boolean;
}

export function BaseHeaderLayout({
	currentUser,
	leftExtra,
	rightExtra,
	showUserMenu = true,
}: BaseHeaderLayoutProps) {
	return (
		<header className="z-10 w-full">
			<div className="max-w-7xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center">
				<div className="flex items-center gap-4">
					<LocaleLink to="/home" className="flex items-center">
						<img
							src="/logo.svg"
							alt="Evame"
							className="h-8 w-20 dark:invert"
							aria-label="Evame Logo"
						/>
					</LocaleLink>
					{leftExtra}
				</div>
				<div className="flex items-center gap-4">
					{rightExtra}
					{showUserMenu && currentUser && (
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Avatar className="w-6 h-6">
									<AvatarImage
										src={currentUser.icon}
										alt={currentUser.displayName}
									/>
									<AvatarFallback>
										{currentUser.userName.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="m-2 p-0 rounded-xl min-w-40">
								<DropdownMenuItem asChild>
									<NavLocaleLink
										to={`/user/${currentUser.userName}`}
										className={({ isPending }) =>
											isPending
												? "opacity-50"
												: "opacity-100 w-full  px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
										}
									>
										<div className="flex flex-col items-start">
											{currentUser.displayName}
											<span className="text-xs text-gray-500">
												@{currentUser.userName}
											</span>
										</div>
									</NavLocaleLink>
								</DropdownMenuItem>
								<DropdownMenuSeparator className="my-0" />
								<DropdownMenuItem asChild>
									<NavLocaleLink
										to={`/user/${currentUser.userName}/page-management`}
										className={({ isPending }) =>
											isPending
												? "opacity-50"
												: "opacity-100 w-full rounded-none flex items-center gap-2 justify-start text-left px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
										}
									>
										<SettingsIcon className="w-4 h-4" />
										Page Management
									</NavLocaleLink>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<ModeToggle />
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Form
										method="post"
										action="/resources/header"
										className="w-full !p-0"
									>
										<button
											type="submit"
											name="intent"
											value="logout"
											className="w-full gap-2 flex cursor-pointer items-center px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground text-red-500"
										>
											<LogOutIcon className="w-4 h-4" />
											Log out
										</button>
									</Form>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>
		</header>
	);
}
