// app/components/FollowListDialog.tsx

import type { User } from "@prisma/client";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

interface FollowListDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "followers" | "following";
	users: User[];
}

export function FollowListDialog({
	open,
	onOpenChange,
	type,
	users,
}: FollowListDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
								<li key={user.id}>
									<a href={`/user/${user.handle}`} className="underline">
										{user.displayName} (@{user.handle})
									</a>
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
