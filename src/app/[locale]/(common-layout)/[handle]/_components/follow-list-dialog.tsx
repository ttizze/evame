// app/components/FollowListDialog.tsx

import { Link } from "@tanstack/react-router";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type followListUser = {
	handle: string;
	name: string;
	image: string;
};

interface FollowListDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "followers" | "following";
	users: followListUser[];
	locale: string;
}

export function FollowListDialog({
	open,
	onOpenChange,
	type,
	users,
	locale,
}: FollowListDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{type === "followers" ? "Followers" : "Following"}
					</DialogTitle>
				</DialogHeader>
				<div className="py-4">
					{users.length === 0 && <p>No users found.</p>}
					{users.length > 0 && (
						<ul className="space-y-2">
							{users.map((user) => (
								<li key={user.handle}>
									<Link
										className="underline"
										params={{ handle: user.handle, locale }}
										to="/$locale/$handle"
									>
										{user.name} (@{user.handle})
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
