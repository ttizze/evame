import type { ComponentProps } from "react";
import { UserAvatar } from "@/components/user-avatar";

export function AccountMenuButton({
	handle,
	image,
	unreadCount,
	unreadDescription,
	descriptionId,
	...props
}: ComponentProps<"button"> & {
	handle: string;
	image: string;
	unreadCount: number;
	unreadDescription: string;
	descriptionId: string;
}) {
	return (
		<button
			{...props}
			aria-describedby={unreadCount > 0 ? descriptionId : undefined}
			className="relative"
			type="button"
		>
			<span aria-hidden="true" className="contents">
				<UserAvatar
					className="w-6 h-6 cursor-pointer"
					image={image || null}
					name={handle}
				/>
			</span>
			<span
				aria-hidden="true"
				className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4"
				data-testid="unread-count"
				hidden={unreadCount === 0}
			>
				{unreadCount > 99 ? "99+" : unreadCount}
			</span>
			<span
				className="sr-only"
				data-unread-description
				hidden={unreadCount === 0}
				id={descriptionId}
			>
				{unreadDescription}
			</span>
		</button>
	);
}
