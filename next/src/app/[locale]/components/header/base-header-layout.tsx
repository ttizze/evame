"use client";
import { signOutAction } from "@/app/[locale]/auth-action";
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
import Image from "next/image";
import type { ReactNode } from "react";
import { ModeToggle } from "../mode-toggle";
import Headroom from 'react-headroom';

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
		<Headroom>
			<header className="z-10 w-full bg-background">
				<div className="max-w-7xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center">
					<div className="flex items-center gap-4">
					<Link href="/" className="flex items-center">
						<Image
							src="/logo.svg"
							alt="Evame"
							width={80}
							height={32}
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
								<DropdownMenuItem className="p-0">
									<Link
										href={`/user/${currentUser.handle}`}
										className="opacity-100 w-full rounded-none px-4 py-3  cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
								<DropdownMenuItem className="p-0 ">
									<Link
										href={`/user/${currentUser.handle}/page-management`}
										className="flex items-center opacity-100 w-full rounded-none gap-2 px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
										onClick={signOutAction}
										className="w-full gap-2 flex rounded-none cursor-pointer items-center px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground text-red-500"
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
		</Headroom>
	);
}
