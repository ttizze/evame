import {
	ArrowLeft,
	Bell,
	BookOpenIcon,
	Loader2,
	LogOutIcon,
	SettingsIcon,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { LocaleSelector } from "@/app/[locale]/(common-layout)/_components/header/locale-selector/client";
import { ModeToggle } from "@/app/[locale]/(common-layout)/_components/header/mode-toggle";
import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationsList } from "./notifications-list";
import { TranslationHelpPopover } from "./translation-help-popover.client";

interface UserMenuProps {
	currentUser: { handle: string; name: string; image: string; plan: string };
	hasGeminiApiKey?: boolean;
	locale: string;
}

async function fetchNotifications() {
	const response = await fetch("/api/notifications", {
		credentials: "include",
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response.json() as Promise<{
		notifications: NotificationRowsWithRelations[];
	}>;
}

export function UserMenu({
	currentUser,
	hasGeminiApiKey = false,
	locale,
}: UserMenuProps) {
	const t = useTranslations("Header");
	const unreadDescriptionId = useId();
	const menuRef = useRef<HTMLDivElement>(null);
	const [showNotifications, setShowNotifications] = useState(false);
	const { data, error, isLoading, mutate } = useSWR(
		"/api/notifications",
		fetchNotifications,
		{ revalidateOnFocus: true },
	);
	const unreadCount =
		data?.notifications.filter((notification) => !notification.read).length ??
		0;
	const readNotifications = async () => {
		try {
			await mutate(await fetchNotifications(), { revalidate: false });
		} catch {
			toast.error(t("notificationsRetry"));
			return;
		}
		try {
			const response = await fetch("/api/notifications", {
				method: "POST",
				credentials: "include",
			});
			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
				return;
			}
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			await mutate(
				(previous) =>
					previous
						? {
								notifications: previous.notifications.map((notification) => ({
									...notification,
									read: true,
								})),
							}
						: previous,
				{ revalidate: false },
			);
		} catch {
			toast.error(t("notificationsReadError"));
		}
	};
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
		<DropdownMenu
			modal={false}
			onOpenChange={(open) => {
				if (open) setShowNotifications(false);
			}}
		>
			<DropdownMenuTrigger
				aria-describedby={unreadCount > 0 ? unreadDescriptionId : undefined}
				aria-label={t("accountMenu")}
				className="relative"
			>
				<Avatar className="w-6 h-6 cursor-pointer">
					<AvatarImage
						alt={currentUser.name}
						height={40}
						src={currentUser.image}
						width={40}
					/>
					<AvatarFallback>
						{currentUser.handle.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				{unreadCount > 0 && (
					<>
						<span
							aria-hidden="true"
							className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4"
							data-testid="unread-count"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
						<span className="sr-only" id={unreadDescriptionId}>
							{t("unreadNotifications", { count: unreadCount })}
						</span>
					</>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				aria-label={showNotifications ? t("notifications") : undefined}
				className={cn(
					"m-2 p-0 rounded-xl min-w-40",
					showNotifications &&
						"w-80 max-w-[calc(100vw-1rem)] max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto",
				)}
				data-testid={
					showNotifications ? "notifications-menu-content" : undefined
				}
				ref={menuRef}
			>
				{showNotifications ? (
					<>
						<DropdownMenuItem
							aria-label={t("backToAccount")}
							className="gap-2 px-4 py-3 cursor-pointer"
							onSelect={(event) => {
								event.preventDefault();
								menuRef.current?.focus({ preventScroll: true });
								setShowNotifications(false);
							}}
						>
							<ArrowLeft className="h-4 w-4" />
							{t("backToAccount")}
						</DropdownMenuItem>
						<DropdownMenuSeparator className="my-0" />
						{isLoading ? (
							<DropdownMenuItem disabled>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t("notificationsLoading")}
							</DropdownMenuItem>
						) : error ? (
							<DropdownMenuItem
								onSelect={(event) => {
									event.preventDefault();
									menuRef.current?.focus({ preventScroll: true });
									void readNotifications();
								}}
							>
								{t("notificationsRetry")}
							</DropdownMenuItem>
						) : (
							<NotificationsList
								locale={locale}
								notifications={data?.notifications ?? []}
							/>
						)}
					</>
				) : (
					<>
						<DropdownMenuItem className="p-0">
							<a
								className="opacity-100 w-full rounded-none px-4 py-3  cursor-pointer hover:bg-accent hover:text-accent-foreground"
								href={`/${locale}/${currentUser.handle}`}
							>
								<div className="flex flex-col items-start">
									{currentUser.name}
									<span className="text-xs text-gray-500">
										@{currentUser.handle}
									</span>
								</div>
							</a>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="my-0" />
						<DropdownMenuItem
							aria-label={t("notifications")}
							className="gap-2 px-4 py-3 cursor-pointer"
							onSelect={(event) => {
								event.preventDefault();
								menuRef.current?.focus({ preventScroll: true });
								setShowNotifications(true);
								void readNotifications();
							}}
						>
							<Bell className="h-4 w-4" />
							{t("notifications")}
						</DropdownMenuItem>
						<TranslationHelpPopover inMenu />
						<DropdownMenuSeparator className="my-0" />
						<DropdownMenuItem asChild>
							<a
								className="flex gap-2 px-4 py-3"
								href={`/${locale}/${currentUser.handle}/edit`}
							>
								<SettingsIcon className="w-4 h-4" />
								{t("settings")}
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<a
								className="flex gap-2 px-4 py-3"
								href={`/${locale}/${currentUser.handle}/page-management`}
							>
								<BookOpenIcon className="w-4 h-4" />
								{t("management")}
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<ModeToggle />
						</DropdownMenuItem>
						<LocaleSelector
							currentHandle={currentUser.handle}
							hasGeminiApiKey={hasGeminiApiKey}
							localeSelectorClassName="w-[200px]"
							userPlan={currentUser.plan}
						/>
						<DropdownMenuSeparator className="my-0" />
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
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
