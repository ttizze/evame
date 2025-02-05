// app/components/FollowListDialog.tsx

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import type { SanitizedUser } from "~/types";

interface FollowListDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "followers" | "following";
	users: SanitizedUser[];
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
										{user.name} (@{user.handle})
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
