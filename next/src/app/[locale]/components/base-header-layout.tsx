import { signOutAction } from "@/app/[locale]/action";
import type { SanitizedUser } from "@/app/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ModeToggle } from "./mode-toggle";

interface BaseHeaderLayoutProps {
	currentUser: SanitizedUser | undefined;
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
					<Link href="/" className="flex items-center">
						<img
							src="/logo.svg"
							alt="Evame"
							className="h-8 w-20 dark:invert"
							aria-label="Evame Logo"
						/>
					</Link>
					{leftExtra}
				</div>
				<div className="flex items-center gap-4">
					{rightExtra}
					{showUserMenu && currentUser && (
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Avatar className="w-6 h-6">
									<AvatarImage src={currentUser.image} alt={currentUser.name} />
									<AvatarFallback>
										{currentUser.handle.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="m-2 p-0 rounded-xl min-w-40">
								<DropdownMenuItem asChild>
									<Link
										href={`/user/${currentUser.handle}`}
										className="opacity-100 w-full  px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
								<DropdownMenuItem asChild>
									<Link
										href={`/user/${currentUser.handle}/page-management`}
										className="opacity-100 w-full  px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
									>
										<SettingsIcon className="w-4 h-4" />
										Page Management
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<ModeToggle />
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<button
										type="submit"
										name="intent"
										value="logout"
										onClick={signOutAction}
										className="w-full gap-2 flex cursor-pointer items-center px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground text-red-500"
									>
										<LogOutIcon className="w-4 h-4" />
										Log out
									</button>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>
		</header>
	);
}
