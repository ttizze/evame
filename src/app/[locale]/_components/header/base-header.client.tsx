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
import { BookOpenIcon, LogOutIcon } from "lucide-react";
import Image from "next/image";
import { getImageProps } from "next/image";
import type { ReactNode } from "react";
import { ModeToggle } from "../mode-toggle";
import { useHeaderScroll } from "./hooks/use-header-scroll";
import { LocaleSelector } from "./locale-selector/client";

interface BaseHeaderProps {
	currentUser: SanitizedUser | undefined;
	leftExtra?: ReactNode;
	rightExtra?: ReactNode;
	showUserMenu?: boolean;
	hasGeminiApiKey?: boolean;
}

export function BaseHeader({
	currentUser,
	leftExtra,
	rightExtra,
	showUserMenu = true,
	hasGeminiApiKey = false,
}: BaseHeaderProps) {
	// カスタムフックを使用
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
	const { props } = getImageProps({
		src: currentUser?.image || "",
		alt: currentUser?.name || "",
		width: 40,
		height: 40,
	});
	return (
		<div ref={headerRef}>
			<header
				className={`z-50 bg-background rounded-b-3xl transition-all duration-300 ${!isVisible ? "-translate-y-full" : "translate-y-0"
					} ${isPinned
						? "fixed top-0 left-0 right-0 shadow-md dark:shadow-gray-900"
						: ""
					} max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center`}
			>
				<div className="flex items-center gap-4">
					<Link href="/" className="flex items-center">
						{!currentUser ? (
							<>
								<Image
									src="/favicon.svg"
									alt="Evame"
									width={32}
									height={32}
									className="h-8 w-8 dark:invert md:hidden"
									aria-label="Evame Logo"
								/>
								<Image
									src="/logo.svg"
									alt="Evame"
									width={80}
									height={32}
									className="h-8 w-20 dark:invert hidden md:block"
									aria-label="Evame Logo"
								/>
							</>
						) : (
							<Image
								src="/logo.svg"
								alt="Evame"
								width={80}
								height={32}
								className="h-8 w-20 dark:invert"
								aria-label="Evame Logo"
							/>
						)}
					</Link>
					{leftExtra}
				</div>
				<div className="flex items-center gap-4">
					{rightExtra}
					{showUserMenu && currentUser && (
						<DropdownMenu modal={false}>
							<DropdownMenuTrigger>
								<Avatar className="w-6 h-6">
									<AvatarImage {...props} />
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
								<LocaleSelector
									currentHandle={currentUser.handle}
									hasGeminiApiKey={hasGeminiApiKey}
									localeSelectorClassName="w-[200px]"
								/>
								<DropdownMenuItem className="p-0 ">
									<Link
										href={`/user/${currentUser.handle}/page-management`}
										className="flex items-center opacity-100 w-full rounded-none gap-2 px-4 py-3 cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
			</header>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
